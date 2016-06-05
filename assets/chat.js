var socket;
$(function(){
	socket = io(document.location.origin+':3000');

	socket.on('message', function(items){
		console.log('message', items);
		for (var key in items) {
			showMessage(items[key]);
		}
		
	});

	$(document).on('click', '.chat-item', function(e){
		var $this= $(this);
		var type = $this.data('type');
		var id = $this.data('id');
		openChat(id, type);
	});

	$(document)
		.on('click', '.chat-item', function(e){
			var $this= $(this);
			var type = $this.data('type');
			var id = $this.data('id');
			openChat(id, type);
		})
		.on('keydown', '.chat-field textarea', function(e){
			console.log('click');
		    if (e.ctrlKey && e.keyCode == 13) 
		    { 
		        var $this= $(this);
				var type = $this.data('type');
				var id = $this.data('id');
				var text = $this.val();
				console.log('send message');
				socket.emit(type+'.message', {id: id, text: text});
		    }
		    return true; 
		});

	$('body').append('<div id="chat-list">'+
			'<div class="chat-item" data-id="1" data-type="space">'+
				'<div class="media-object space-profile-acronym-1 space-acronym" style="background-color: #6fdbe8; width: 40px; height: 40px; font-size: 18px; padding: 7px 0;">ДП</div>'+
			'</div>'+
			'<div class="chat-item" data-id="3" data-type="user">'+
				'<img src="http://humhub.dev/uploads/profile_image/9670b44b-f01c-423c-ac43-b2a8d66bb934.jpg?m=1465043190" height="40" width="40">'+
			'</div>'+
		'</div>');
});

function openChat(id, type){
	if ($('#chat-'+type+'-'+id).length) {
		$('#chat-'+type+'-'+id).show();
		return;
	}
	$('body').append('<div id="chat-'+type+'-'+id+'" class="chat-window">'+
			'<div class="chat-messages"></div>'+
			'<form class="chat-field"><textarea data-type="'+type+'" data-id="'+id+'"></textarea></form>'+
		'</div>');
}

function showMessage(message){
	openChat(message.object_id, message.type);
	$('#chat-'+message.type+'-'+message.object_id+' .chat-messages').append('<div class="chat-message">'+
		message.text+
		'</div>');
	if (message.my) {
		$('#chat-'+message.type+'-'+message.object_id+' textarea').val('');
	}
}