var cookie = require('cookie');

var mysql = require('mysql');
var db = mysql.createPool({
	//connectionLimit : 10,
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'humhub'
});

var usersSocket = [];

var chat = {
	objectModelUser: 'humhub\\modules\\user\models\\User',
	objectModelSpace: 'humhub\\modules\\user\models\\Space',
	io: null,
	init: function(io){
		this.io = io;
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
					return;
				}
				console.log('invalid user session');
			});
		}
	},
	addUserSocket: function(socket){
		if (typeof usersSocket[socket.userId] == 'undefined') {
			usersSocket[socket.userId] = {};
		}
		usersSocket[socket.userId][socket.id] = socket;
		var n = 0; for (var key in usersSocket[socket.userId]) { n++; }
		console.log('user '+socket.userId+' has '+n+' sockets');
	},
	removeUserSocket: function(socket){
		delete usersSocket[socket.userId][socket.id];
	},
	getUserRoom: function(users){
		return 'user_'+users.sort().join('_');
	},
	getSpaceRoom: function(space){
		return 'space_'+space;
	},
	joinSpacesRooms: function(socket){
		chat.userSpacesIds(socket.userId, function(rows){
			for (var key in rows) {
				socket.join(chat.getSpaceRoom(rows[key].id));
			}
		})
	},
	joinUserRoom: function(user1, user2){
		var room = chat.getUserRoom([user1, user2]);
		for (var key in usersSocket[user1]) {
			usersSocket[user1][key].join(room);
			console.log('user '+user1+' join to room '+room);
		}
		for (var key in usersSocket[user2]) {
			usersSocket[user2][key].join(room);
			console.log('user '+user2+' join to room '+room);
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
				chat.sendMessage(room, socket.userId, rows);
				chat.sentMessageStatus(socket, rows);
			}
		);
	},
	spaceSay: function(socket, spaceId, message){
		chat.inserMessage(
			{userId: socket.userId, objectModel: chat.objectModelSpace, objectId: spaceId, text: message},
			function(rows){
				var room = chat.getSpaceRoom(spaceId);
				chat.sendMessage(room, socket.userId, rows);
				chat.sentMessageStatus(socket, rows);
			}
		);
	},
	inserMessage: function(data, callback){
		db.query(
			'INSERT INTO chat_message (user_id, object_model, object_id, text, created_at) VALUES (?, ?, ?, ?, NOW())',
			[data.userId, data.objectModel, data.objectId, data.text],
		 	function(err, result){
				if (err) throw err;
				chat.messageById(result.insertId, callback);
			}
		);
	},
	sentMessageStatus: function(socket, message){
		message = chat.prepareMessages(socket.userId, message);
		socket.emit('message.status', {
			id: message[0].object_id,
			type: message[0].type,
			text: message[0].text,
			status: true
		});
	},
	sendMessage: function(room, userId, messages){
		messages = chat.prepareMessages(userId, messages);
		chat.io.to(room).emit('chat-messages', {items: messages, append: true});
		console.log(room+' send message');
	},
	prepareMessages: function(userId, messages){
		return chat.replaceObjectType(messages, true);
	},
	prepareChatItems: function(items){
		if (!Array.isArray(items)) {
			items.online = chat.checkOnline(items.id, items.type);
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
		if (type == 'space') {
			var usersOnline = typeof chat.io.sockets.adapter.rooms[chat.getSpaceRoom(id)] != 'undefined' ?
				chat.io.sockets.adapter.rooms[chat.getSpaceRoom(id)]:
				[];
			var online = [];
			for (var key in usersOnline) {
				if (online.indexOf(usersOnline[key].userId) == -1) online.push(usersOnline[key].userId);
			}
			return online.length;
		}
	},
	messageById: function(id, callback){
		db.query(
			"SELECT cm.*, cmr.read_at FROM chat_message cm LEFT JOIN chat_message_read cmr ON cm.object_model = ? AND cm.object_id = cmr.user_id WHERE cm.id = ?",
			[chat.objectModelUser, id],
			function(err, rows, fields){
				if (err) throw err;
				callback(rows);
			}
		);
	},
	chatsList: function(userId, callback){
		db.query(
			"SELECT u.id, cu.id as user_chat_id, 'user' as type, u.guid, CONCAT_WS(' ', p.firstname, p.lastname) as name, p.title, '' as color "+
				"FROM user u, profile p, chat_user cu "+
				"WHERE u.id = p.user_id AND u.id = cu.object_id AND cu.user_id = ? AND cu.object_model = ? "+
				"UNION ALL SELECT s.id, cu.id as user_chat_id, 'space' as type, s.guid, s.name, s.description as title, s.color "+
				"FROM space s, chat_user cu "+
				"WHERE s.id = cu.object_id AND cu.user_id = ? AND cu.object_model = ?"+
				"ORDER BY user_chat_id",
			[userId, chat.objectModelUser, userId, chat.objectModelSpace],
			function(err, rows, fields){
				if (err) throw err;
				callback(rows);
			}
		);
	},
	getChatList: function(socket, data){
		chat.chatsList(socket.userId, function(items){
			console.log('user', socket.userId, 'send chat-list');
			items = chat.prepareChatItems(items);
			socket.emit('chat-list', items);
		});
	},
	searchChat: function(socket, data){
		var search = '%'+data.text.replace(/\s+/g, '%')+'%';
		db.query(
			"SELECT u.id, 'user' as type, u.guid, CONCAT_WS(' ', p.firstname, p.lastname) as name, p.title, '' as color "+
				"FROM user u, profile p "+
				"WHERE u.id = p.user_id AND CONCAT_WS(' ', p.firstname, p.lastname) LIKE ? "+
				"UNION ALL SELECT s.id, 'space' as type, s.guid, s.name, s.description as title, s.color "+
				"FROM space s "+
				"WHERE s.name LIKE ? ",
			[search, search],
			function(err, rows, fields){
				if (err) throw err;
				rows = chat.prepareChatItems(rows);
				socket.emit('search.chat', rows);
				console.log('search chats');
			});
	},
	addChat: function(socket, data){
		data = chat.replaceType(data);
		db.query(
			'INSERT INTO chat_user (user_id, object_model, object_id) VALUES (?, ?, ?)',
			[socket.userId, data.objectModel, data.id],
		 	function(err, result){
				if (err) throw err;
				console.log('add chat');
				var res = chat.prepareChatItems({status: true, type: data.type, id: data.id});
				socket.emit('add.chat-status', res);
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
				console.log('delete chat');
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
		chat.chatMessages(params.id, params.type, params.time, function(items){
			items = chat.prepareMessages(socket.userId, items);
			console.log('chat messages ', params.type, params.id);
			socket.emit('chat-messages', {items: items, append: true});
		});
	},
	chatMessages: function(id, type, time, callback){
		type = chat.replaceType(type);
		db.query(
			"SELECT cm.*, cmr.read_at FROM chat_message cm LEFT JOIN chat_message_read cmr ON cm.object_model = ? AND cm.object_id = cmr.user_id WHERE "+(type == chat.objectModelUser ? "cm.object_model = ? AND (cm.user_id = ? OR cm.object_id = ?) " : "cm.object_model = ? AND cm.object_id = ? ORDER BY cm.created_at"),
			[chat.objectModelUser, type, id, id],
			function(err, rows, fields){
				if (err) throw err;
				callback(rows);
			}
		);
	},
};

module.exports = chat;