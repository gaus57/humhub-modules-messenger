var socket;
$(function(){
	socket = io(document.location.origin+':3000');

	socket.on('message', function(data){
		console.log('message', data);
	});
});
