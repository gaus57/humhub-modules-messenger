var cookie = require('cookie');

var mysql = require('mysql');
try {
var db = mysql.createPool({
	//connectionLimit : 10,
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'humhub'
});
} catch(err) {
	console.log(err);
}

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
		if (typeof usersSocket[socket.userId] != 'array') {
			usersSocket[socket.userId] = [socket];
		} else {
			usersSocket[socket.userId].push(socket);
		}
		console.log('user '+socket.userId+' has '+usersSocket[socket.userId].length+' sockets');
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
		for (var key in messages) {
			messages[key].my = (messages[key].user_id == userId);
		}
		//console.log('in_room', chat.io.sockets.adapter.rooms[room].length);
		chat.io.to(room).emit('message', messages);
		console.log(room+' send message');
	},
	messageById: function(id, callback){
		db.query(
			"SELECT * FROM chat_message WHERE id = ?",
			[id],
			function(err, rows, fields){
				if (err) throw err;
				callback(rows);
			}
		);
	}
};

module.exports = chat;