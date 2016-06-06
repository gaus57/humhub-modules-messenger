var socket;

$(function(){
	socket = io(document.location.origin+':3000');

	// запрашиваем список чатов
	socket.emit('get.chat-list');

	socket.on('chat-messages', function(data){
			console.log('message', data);
			chatMessages(data.items, data.append);
		})
		.on('chat-list', function(data){
			chatList(data);
		});

	$(document)
		.on('click', '.chat-item', function(e){
			var $this = $(this);
			var type = $this.data('type');
			var id = $this.data('id');
			openChatWindow(id, type);
		})
		.on('keydown', '.chat-field textarea', function(e){
			console.log('click');
			if (e.keyCode == 13) {
		        if (e.ctrlKey) {
		            var val = this.value;
		            if (typeof this.selectionStart == "number" && typeof this.selectionEnd == "number") {
		                var start = this.selectionStart;
		                this.value = val.slice(0, start) + "\n" + val.slice(this.selectionEnd);
		                this.selectionStart = this.selectionEnd = start + 1;
		            } else if (document.selection && document.selection.createRange) {
		                this.focus();
		                var range = document.selection.createRange();
		                range.text = "\r\n";
		                range.collapse(false);
		                range.select();
		            }
		        } else {
		        	var $this= $(this);
					var type = $this.data('type');
					var id = $this.data('id');
					var text = $this.val();
					if (!text) { return; }
					console.log('send message');
					socket.emit(type+'.message', {id: id, text: text});
					$('#chat-'+type+'-'+id+' textarea').val('');
			    }
		        return false;
		    }
		})
		.on('mouseup', function(e){
		    var container = $(".chat-window");
		    if (!container.is(e.target) && container.has(e.target).length === 0) {
		        container.hide();
		    }
		});
});

function openChatWindow(id, type){
	if ($('#chat-'+type+'-'+id).length) {
		$('#chat-'+type+'-'+id).show();
		return;
	}
	chatWindow(id, type);
}

function chatWindow(id, type){	
	var name = $('.chat-item[data-id='+id+'][data-type='+type+'] .chat-item-title b').text();
	$('body').append('<div id="chat-'+type+'-'+id+'" class="chat-window">'+
			'<div class="chat-head">'+name+'</div>'+
			'<div class="chat-content">'+
				'<div class="chat-messages"></div>'+
				'<form class="chat-field"><textarea data-type="'+type+'" data-id="'+id+'"></textarea></form>'+
			'</div>'+
		'</div>');
	socket.emit('get.chat-messages', {id: id, type: type});
}

function chatMessages(messages, append){
	append = typeof append == 'undefined' ? true : append;
	var chats = {};
	for (var key in messages) {
		var chatId = messages[key].type == 'space' ?
			'chat-'+messages[key].type+'-'+messages[key].object_id :
			'chat-'+messages[key].type+'-'+(messages[key].my ? messages[key].object_id : messages[key].user_id);
		if (typeof chats[chatId] == 'undefined') {
			chats[chatId] = [];
		}
		chats[chatId].push('<div class="chat-message-wrap'+(messages[key].my ? ' chat-message-my' : '')+(!messages[key].read_at ? ' chat-message-notread' : '')+'" data-id="'+messages[key].id+'">'+
			'<div class="chat-message">'+
				messages[key].text.replace(/(\r\n|\r|\n)/g, '<br>')+
			'</div>');
	}
	for (var key in chats) {
		if (append) {
			$('#'+key+' .chat-messages').append(chats[key]).scrollTop(999999);
		} else {
			$('#'+key+' .chat-messages').prepend(chats[key]);
		}
	}
}

function chatList(items){
	var content = '<div id="chat-list">';
	for (var key in items) {
		content += '<div class="chat-item" data-id="'+items[key].id+'" data-type="'+items[key].type+'">'+
				'<img src="/uploads/profile_image/'+items[key].guid+'.jpg" height="40" width="40">'+
				'<div class="chat-item-title"><b>'+items[key].name+'</b><i>'+items[key].title+'</i></div>'+
			'</div>';
	}
	content += '</div>';
	$('body').append(content);
}