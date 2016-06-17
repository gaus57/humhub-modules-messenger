var server = require('http').createServer();
var io = require('socket.io')(server);

var config = require('./config');
var chat = require('./chat');
chat.init(io);

io.on('connection', function(socket){
	console.log('a user connected');
	
	try {
		// авторизуем пользователя через сессию
		chat.auth(socket);

		socket.on('get.chat-list', function(data){
	  	chat.getChatList(socket, data);
	  });

	  socket.on('get.notread-messages', function(data){
	  	chat.getNotReadMessages(socket, data);
	  });

	  socket.on('search.chat', function(data){
	  	chat.searchChat(socket, data);
	  });

	  socket.on('add.chat', function(data){
	  	chat.addChat(socket, data);
	  });

	  socket.on('delete.chat', function(data){
	  	chat.deleteChat(socket, data);
	  });

	  socket.on('get.chat-messages', function(data){
	  	chat.getChatMessages(socket, data);
	  });

	  socket.on('user.message', function(data){
	  	chat.userSay(socket, data.id, data.text);
	  });

	  socket.on('space.message', function(data){
	  	chat.spaceSay(socket, data.id, data.text);
	  });

	  socket.on('messages.read', function(data){
	  	chat.readMessages(socket, data);
	  });

	  socket.on('disconnect', function(){
	  	chat.removeUserSocket(socket);
	  });
	} catch (err) {
		console.log(err);
		socket.emit('error', err);
	}
});

server.listen(config.port);
console.log('server is started. listen port '+config.port);