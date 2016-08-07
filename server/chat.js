var config = require('./config');
var cookie = require('cookie');
const fs = require('fs');

var mysql = require('mysql');
var db = mysql.createPool({
	//connectionLimit : 10,
  host     : config.dbHost,
  user     : config.dbUser,
  password : config.dbPass,
  database : config.dbDatabase,
});

var usersSocket = [];
var chatItems = {};

var chat = {
	objectModelUser: 'humhub\\modules\\user\\models\\User',
	objectModelSpace: 'humhub\\modules\\space\\models\\Space',
	io: null,
	init: function(io){
		this.io = io;
		chat.loadChatItems();
		setInterval(chat.loadChatItems, 1000*60*1);
	},
	loadChatItems: function(){
		db.query(
			"SELECT u.id, 'user' as type, u.guid, CONCAT_WS(' ', p.firstname, p.lastname) as name, p.title, '' as color "+
				"FROM user u, profile p "+
				"WHERE u.id = p.user_id "+
				"UNION ALL SELECT s.id, 'space' as type, s.guid, s.name, s.description as title, s.color "+
				"FROM space s",
			function(err, rows, fields){
				if (err) throw err;
				for (var n in rows) {
					chat.addChatItemCache(rows[n]);
				}
			}
		);
	},
	addChatItemCache: function(item){
		fs.exists(config.userImagePath+item.guid+'.jpg', function(exists){
			if (exists) {
				item.image = config.userImageUrl+item.guid+'.jpg';
			} else {
				item.image = item.type == 'user' ? config.userImageUrlDefault : null;
			}
			item.title = item.title || '';
			chatItems[item.type+'-'+item.id] = item;
		});
	},
	getChatItem: function(type, id){
		var key = type+'-'+id;
		return chatItems[key] ? chatItems[key] : false;
	},
	auth: function(socket){
		var cookies = cookie.parse(socket.request.headers.cookie);
		if (typeof cookies.PHPSESSID != 'undefined') {
			db.query("SELECT user_id FROM user_http_session WHERE id = ?", [cookies.PHPSESSID], function(err, rows, fields){
				if (err) throw err;
				if (rows[0].user_id != 'undefined') {
					socket.userId = rows[0].user_id;
					chat.addUserSocket(socket);
					chat.joinSpacesRooms(socket);
					// отправляем пользователю его id
					socket.emit('user-id', {'id': socket.userId});
					//send online status
					socket.broadcast.emit('chat.online', {type: 'user', id: socket.userId});
					return;
				}
				//console.log('invalid user session');
			});
		}
	},
	addUserSocket: function(socket){
		if (typeof usersSocket[socket.userId] == 'undefined') {
			usersSocket[socket.userId] = {};
		}
		usersSocket[socket.userId][socket.id] = socket;
		var n = 0; for (var key in usersSocket[socket.userId]) { n++; }
		//console.log('user '+socket.userId+' has '+n+' sockets');
	},
	removeUserSocket: function(socket){
		delete usersSocket[socket.userId][socket.id];
		socket.broadcast.emit('chat.ofline', {type: 'user', id: socket.userId});
	},
	getUserRoom: function(users){
		return 'user_'+users.sort().join('_');
	},
	getSpaceRoom: function(space){
		return 'space_'+space;
	},
	joinSpacesRooms: function(socket){
		chat.userSpacesIds(socket.userId, function(rows){
			var ids = [];
			for (var key in rows) {
				socket.join(chat.getSpaceRoom(rows[key].id));
				//console.log('user', socket.userId, 'join room', chat.getSpaceRoom(rows[key].id));
				ids.push(rows[key].id);
			}
			chat.getNotReadMessages(socket, ids);
		});
	},
	joinUserRoom: function(user1, user2){
		var room = chat.getUserRoom([user1, user2]);
		for (var key in usersSocket[user1]) {
			usersSocket[user1][key].join(room);
			//console.log('user '+user1+' join to room '+room);
		}
		for (var key in usersSocket[user2]) {
			usersSocket[user2][key].join(room);
			//console.log('user '+user2+' join to room '+room);
		}
		return room;
	},
	userSpacesIds: function(userId, callback){
		db.query(
			"SELECT space_id as 'id' FROM space_membership WHERE status = 3 AND user_id = ?",
			[userId],
			function(err, rows, fields){
				if (err) throw err;
				callback(rows);
			}
		);
	},
	userSay: function(socket, userId, message){
		chat.inserMessage(
			{userId: socket.userId, objectModel: chat.objectModelUser, objectId: userId, text: message},
			function(rows){
				var room = chat.joinUserRoom(socket.userId, userId);
				chat.sendMessage(room, socket.userId, {type: 'user', items: rows, append: true});
				chat.sendMessageStatus(socket, rows);
			}
		);
	},
	spaceSay: function(socket, spaceId, message){
		chat.inserMessage(
			{userId: socket.userId, objectModel: chat.objectModelSpace, objectId: spaceId, text: message},
			function(rows){
				var room = chat.getSpaceRoom(spaceId);
				chat.sendMessage(room, socket.userId, {type: 'space', id: spaceId, items: rows, append: true});
				chat.sendMessageStatus(socket, rows);
			}
		);
	},
	inserMessage: function(data, callback){
		db.query(
			'INSERT INTO chat_message (user_id, object_model, object_id, text, created_at) VALUES (?, ?, ?, ?, NOW())',
			[data.userId, data.objectModel, data.objectId, chat.escapeHtml(data.text)],
		 	function(err, result){
				if (err) throw err;
				chat.messageById(result.insertId, callback);
			}
		);
	},
	escapeHtml: function(text) {
	  var map = {
	    '<': '&lt;',
	    '>': '&gt;',
	    '"': '&quot;',
	    "'": '&#039;'
	  };
	  return text.replace(/[<>"']/g, function(m) { return map[m]; });
	},
	sendMessageStatus: function(socket, message){
		message = chat.prepareMessages(socket.userId, message);
		socket.emit('message.status', {
			id: message[0].object_id,
			type: message[0].type,
			text: message[0].text,
			status: true
		});
	},
	sendMessage: function(room, userId, data){
		data.items = chat.prepareMessages(userId, data.items);
		chat.io.to(room).emit('chat-messages', data);
		//console.log(room+' send message');
	},
	prepareMessages: function(userId, messages){
		messages = chat.replaceObjectType(messages, true);
		for (var key in messages) {
			messages[key].user = chat.getChatItem('user', messages[key].user_id);
			messages[key].object = chat.getChatItem(messages[key].type, messages[key].object_id);
		}
		return messages;
	},
	prepareChatItems: function(items){
		if (!Array.isArray(items)) {
			items.online = chat.checkOnline(items.id, items.type);
			if (!items.image) {
				chatItem = chat.getChatItem(items.type, items.id);
				items.image = chatItem ? chatItem.image : null;
			}
			return items;
		}
		for (var key in items) {
			items[key] = chat.prepareChatItems(items[key]);
		}
		return items;
	},
	checkOnline: function(id, type){
		type = type || 'user';
		if (type == 'user') {
			var online = 0;
			if (typeof usersSocket[id] != 'undefined') {
				for (var key in usersSocket[id]) {
					online++;
				}
			}
			return !!online;
		}
		//@todo Решить вопрос с подсчетом онлайн пространства
		return false;

		if (type == 'space') {
			var usersOnline = typeof chat.io.sockets.adapter.rooms[chat.getSpaceRoom(id)];
			//console.log(usersOnline);
			var online = [];
			if (!usersOnline) return 0;
			for (var key in usersOnline) {
				var client = chat.io.sockets.adapter.nsp.connected[key];
				if (online.indexOf(client.userId) == -1) online.push(client.userId);
			}
			return online.length;
		}
	},
	messageById: function(id, callback){
		db.query(
			"SELECT cm.*, cmr.read_at FROM chat_message cm LEFT JOIN chat_message_read cmr ON cm.object_model = ? AND cm.object_id = cmr.user_id AND cm.id = cmr.chat_message_id WHERE cm.id = ?",
			[chat.objectModelUser, id],
			function(err, rows, fields){
				if (err) throw err;
				callback(rows);
			}
		);
	},
	chatsList: function(userId, callback){
		db.query(
			"SELECT object_id, object_model "+
				"FROM chat_user "+
				"WHERE user_id = ? "+
				"ORDER BY id",
			[userId],
			function(err, rows, fields){
				if (err) throw err;
				rows = chat.replaceObjectType(rows);
				var items = [];
				for (var n in rows) {
					items.push(chat.getChatItem(rows[n].type, rows[n].object_id));
				}
				callback(items);
			}
		);
	},
	getChatList: function(socket, data){
		chat.chatsList(socket.userId, function(items){
			//console.log('user', socket.userId, 'send chat-list');
			items = chat.prepareChatItems(items);
			socket.emit('chat-list', {items: items});
		});
	},
	getNotReadMessages: function(socket, spaceIds){
		chat.notReadMessages(socket.userId, spaceIds, function(items){
			items = chat.prepareMessages(socket.userId, items);
			socket.emit('notread-messages', {items: items});
		});
	},
	notReadMessages: function(userId, spaceIds, callback){
		db.query(
			"SELECT cm.*, cmr.read_at FROM chat_message cm "+
				"LEFT JOIN chat_message_read cmr ON cm.id = cmr.chat_message_id AND cmr.user_id = ? "+
				"WHERE cmr.read_at IS NULL AND cm.object_id = ? AND cm.object_model = ?",
			[userId, userId, chat.objectModelUser],
			function(err, rows, fields){
				if (err) throw err;
				callback(rows);
			}
		);
		if (!spaceIds.length) return;
		db.query(
			"SELECT cm.*, cmr.read_at FROM chat_message cm "+
				"LEFT JOIN chat_message_read cmr ON cm.id = cmr.chat_message_id AND cmr.user_id = ? "+
				"WHERE cmr.read_at IS NULL AND cm.object_id IN(?) AND cm.object_model = ? AND cm.user_id != ?",
			[userId, spaceIds, chat.objectModelSpace, userId],
			function(err, rows, fields){
				if (err) throw err;
				callback(rows);
			}
		);
	},
	searchChat: function(socket, data){
		var search = '%'+data.text.replace(/\s+/g, '%')+'%';
		db.query(
			"SELECT u.id, 'user' as type, u.guid, CONCAT_WS(' ', p.firstname, p.lastname) as name, p.title, '' as color "+
				"FROM user u, profile p "+
				"WHERE u.id = p.user_id AND u.id != ? AND CONCAT_WS(' ', p.firstname, p.lastname) LIKE ? "+
				"UNION ALL SELECT s.id, 'space' as type, s.guid, s.name, s.description as title, s.color "+
				"FROM space s, space_membership sm "+
				"WHERE sm.space_id = s.id AND sm.status = 3 AND sm.user_id = ? AND s.name LIKE ? ",
			[socket.userId, search, socket.userId, search],
			function(err, rows, fields){
				if (err) throw err;
				rows = chat.prepareChatItems(rows);
				socket.emit('search.chat', {items: rows});
				//console.log('search chats');
			});
	},
	addChat: function(socket, data){
		data = chat.replaceType(data);
		db.query(
			'SELECT * FROM chat_user WHERE user_id = ? AND object_model = ? AND object_id = ?',
			[socket.userId, data.objectModel, data.id],
		 	function(err, rows, fields){
				if (err) throw err;
				
				if (rows.length) return;
				db.query(
					'INSERT INTO chat_user (user_id, object_model, object_id) VALUES (?, ?, ?)',
					[socket.userId, data.objectModel, data.id],
				 	function(err, result){
						if (err) throw err;
						//console.log('add chat');
						var res = chat.prepareChatItems({status: true, type: data.type, id: data.id});
						socket.emit('add.chat-status', res);
					}
				);
			}
		);
	},
	deleteChat: function(socket, data){
		data = chat.replaceType(data);
		db.query(
			'DELETE FROM chat_user WHERE user_id = ? AND object_model = ? AND object_id = ?',
			[socket.userId, data.objectModel, data.id],
		 	function(err, result){
				if (err) throw err;
				//console.log('delete chat');
			}
		);
	},
	replaceType: function(items, remove){
		remove = remove || false;
		if (typeof items == 'string') {
			switch (items) {
				case 'user':
					return chat.objectModelUser;
					break;
				case 'space':
					return chat.objectModelSpace;
					break;
			}
			return null;
		}
		if (!Array.isArray(items)) {
			switch (items.type) {
				case 'user':
					items.objectModel = chat.objectModelUser;
					break;
				case 'space':
					items.objectModel = chat.objectModelSpace;
					break;
			}
			if (remove) delete items.type;
			return items;
		}
		for (var key in items) {
			items[key] = chat.replaceType(items[key]);
		}
		return items;
	},
	replaceObjectType: function(items, remove){
		remove = remove || false;
		if (typeof items == 'string') {
			switch (items) {
				case chat.objectModelUser:
					return 'user';
					break;
				case chat.objectModelSpace:
					return 'space';
					break;
			}
			return null;
		}
		if (!Array.isArray(items)) {
			switch (typeof items.objectModel != 'undefined' ? items.objectModel : items.object_model) {
				case chat.objectModelUser:
					items.type = 'user';
					break;
				case chat.objectModelSpace:
					items.type = 'space';
					break;
			}
			if (remove && items.objectModel) delete items.objectModel;
			if (remove && items.object_model) delete items.object_model;
			return items;
		}
		for (var key in items) {
			items[key] = chat.replaceObjectType(items[key]);
		}
		return items;
	},
	getChatMessages: function(socket, params){
		chat.chatMessages(socket.userId, params.type, params.id, params.last, function(items){
			items = chat.prepareMessages(socket.userId, items);
			//console.log('chat messages ', params.type, params.id);
			socket.emit('chat-messages', {type: params.type, id: params.id, items: items, append: !params.last, end: (items.length < 30)});
		});
	},
	chatMessages: function(user_id, type, id, last, callback){
		type = chat.replaceType(type);
		if (type == chat.objectModelUser) {
			db.query(
				"SELECT cm.*, cmr.read_at FROM chat_message cm "+
					"LEFT JOIN chat_message_read cmr ON cm.id = cmr.chat_message_id AND cm.object_id = cmr.user_id "+
					"WHERE cm.object_model = ? AND ((cm.user_id = ? AND cm.object_id = ?) OR (cm.user_id = ? AND cm.object_id = ?)) "+
					(last ? "AND cm.id < "+db.escape(last)+' ' : '')+
					"ORDER BY cm.id DESC "+
					"LIMIT 30",
				[type, user_id, id, id, user_id],
				function(err, rows, fields){
					if (err) throw err;
					callback(rows.reverse());
				}
			);
		} else {
			db.query(
				"SELECT cm.*, 1 as read_at FROM chat_message cm "+
					"WHERE cm.object_model = ? AND cm.object_id = ? "+
					(last ? "AND cm.id < "+db.escape(last)+' ' : '')+
					"ORDER BY cm.id DESC "+
					"LIMIT 30",
				[type, id],
				function(err, rows, fields){
					if (err) throw err;
					callback(rows.reverse());
				}
			);
		}
	},
	readMessages: function(socket, items){
		var insert = [];
		var sayRead = [];
		for (var key in items) {
			insert.push('('+db.escape(items[key].id)+', '+db.escape(socket.userId)+', NOW())');
			if (items[key].type == 'user') {
				if (!sayRead[items[key].user_id]) sayRead[items[key].user_id] = [];
				sayRead[items[key].user_id].push(items[key]);
			}
		}
		if (!insert.length) return;
		db.query("INSERT IGNORE INTO chat_message_read (chat_message_id, user_id, read_at) VALUES "+insert.join(', '),
			function(err, result){
				if (err) throw err;
				for (var key in sayRead) {
					chat.emitToUser(key, function(userSocket){
						userSocket.emit('messages.read', {items: sayRead[key]});
					});
				}
				//console.log('read messages');
			}
		);
	},
	emitToUser: function(id, callback){
		if (!usersSocket[id]) return false;
		for (var key in usersSocket[id]) {
			callback(usersSocket[id][key]);
		}
		return true;
	},
};

module.exports = chat;