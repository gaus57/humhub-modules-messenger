var server = require('http').createServer();
var io = require('socket.io')(server);

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

	  socket.on('get.chat-messages', function(data){
	  	chat.getChatMessages(socket, data);
	  });

	  socket.on('user.message', function(data){
	  	chat.userSay(socket, data.id, data.text);
	  });

	  socket.on('space.message', function(data){
	  	chat.spaceSay(socket, data.id, data.text);
	  });

	  socket.on('disconnect', function(){
	  	chat.removeUserSocket(socket);
	  });
	} catch (err) {
		console.log(err);
		socket.emit('error', err);
	}
});

server.listen(3000);
console.log('server is started');