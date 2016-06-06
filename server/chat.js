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
			}
		);
	},
	spaceSay: function(socket, spaceId, message){
		chat.inserMessage(
			{userId: socket.userId, objectModel: chat.objectModelSpace, objectId: spaceId, text: message},
			function(rows){
				var room = chat.getSpaceRoom(spaceId);
				chat.sendMessage(room, socket.userId, rows);
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
	sendMessage: function(room, userId, messages){
		messages = chat.prepareMessages(userId, messages);
		//console.log('in_room', chat.io.sockets.adapter.rooms[room].length);
		chat.io.to(room).emit('chat-messages', {items: messages, append: true});
		console.log(room+' send message');
	},
	prepareMessages: function(userId, messages){
		for (var key in messages) {
			messages[key].my = (messages[key].user_id == userId);
			messages[key].type = '';
			switch(messages[key].object_model) {
				case chat.objectModelUser:
					messages[key].type = 'user';
					break;
				case chat.objectModelSpace:
					messages[key].type = 'space';
					break;
			}
		}
		return messages;
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
			"SELECT u.id, 'user' as type, u.guid, CONCAT_WS(' ', p.firstname, p.lastname) as name, p.title "+
				"FROM user u, profile p, chat_message cm "+
				"WHERE u.id = p.user_id AND u.id = cm.object_id AND cm.user_id = ? AND cm.object_model = ? "+
				"GROUP BY 1 "+
				"UNION ALL SELECT s.id, 'space' as type, s.guid, s.name, s.description as title "+
				"FROM space s, chat_message cm "+
				"WHERE s.id = cm.object_id AND cm.user_id = ? AND cm.object_model = ? "+
				"GROUP BY 1",
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
			socket.emit('chat-list', items);
		});
	},
	getChatMessages: function(socket, params){
		chat.chatMessages(params.id, params.type, params.time, function(items){
			items = chat.prepareMessages(socket.userId, items);
			console.log('chat messages ', params.type, params.id);
			socket.emit('chat-messages', {items: items, append: true});
		});
	},
	chatMessages: function(id, type, time, callback){
		switch (type) {
			case 'user':
				type = chat.objectModelUser;
				break;
			case 'space':
				type = chat.objectModelSpace;
				break;
		}
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