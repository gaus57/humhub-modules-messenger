var chat;

$(function(){
	chat = new Chat(document.location.origin+':3000');
});

// Конструктор объекта чата
function Chat(serverUrl){
	var that = this;

	this.socket = io(serverUrl);

	// Запрашиваем список чатов
	that.socket.emit('get.chat-list');

	// Регистрируем слушатели socket.io
	that.socket.on('chat-messages', function(data){
			console.log('message', data);
			that.chatMessages(data.items, data.append);
		})
		.on('chat-list', function(data){
			that.cacheChatItem(data);
			that.chatList(data);
			console.log('chat list', data);
		})
		.on('message.status', function(data){
			console.log('send message status', data);
			if (data.status) {
				that.$chatWindow(data.type, data.id).find('textarea').val('');
			}
		})
		.on('search.chat', function(data){
			that.cacheChatItem(data);
			that.searchResult(data);
			console.log('search result', data);
		})
		.on('user-id', function(data){
			that.userId = data.id;
		})
		.on('add.chat-status', function(data){
			if (data.status) {
				that.addChatItem(data.type, data.id);
				console.log('add chat', data);
			}
		});

	// Регистрируем обработчики событий интерфейса
	$(document)
		.on('click', '.chat-item', function(e){
			var $this = $(this);
			that.openChatWindow($this.data('type'), $this.data('id'));
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
					that.socket.emit(type+'.message', {id: id, text: text});
			    }
		        return false;
		    }
		})
		.on('mouseup', function(e){
		    var container = $(".chat-window");
		    if (!container.is(e.target) && container.has(e.target).length === 0) {
		        container.hide();
		    }
		    var container = $(".chat-search");
		    if (!container.is(e.target) && container.has(e.target).length === 0) {
		        $(".chat-search-field").hide();
		    }
		})
		.on('click', '.chat-search-icon', function(){
			var search = $(this).siblings('.chat-search-field');
			search.toggle();
			if (search.is(':visible')) {
				search.find('input').focus();
			}
		})
		.on('input', '.chat-search-field input', function(){
			if (that.searchTimeOut) clearTimeout(that.searchTimeOut);
			var text = $(this).val();
			if (!text) {
				$('.chat-search-result').html('');
				return;
			}
			that.searchTimeOut = setTimeout(function(){
				that.socket.emit('search.chat', {text: text});
				console.log('search chats', text);
			}, 500);
		})
		.on('click', '.chat-search-item', function(e){
			var $this = $(this);
			if (that.$chatItem($this.data('type'), $this.data('id')).length) return;
			that.socket.emit('add.chat', {id: $this.data('id'), type: $this.data('type')});
		})
		.on('click', '.chat-item-close', function(e){
			e.stopPropagation();
			var $item = $(this).closest('.chat-item');
			that.socket.emit('delete.chat', {type: $item.data('type'), id: $item.data('id')});
			that.$chatWindow($item.data('type'), $item.data('id')).remove();
			$item.remove();
		});

	this.searchTimeOut;

	this.userId;
	this.$chatList = function(){
		return $('#chat-list-items');
	};
	this.$chatItem = function(type, id){
		return $('.chat-item[data-type='+type+'][data-id='+id+']');
	};
	this.$chatWindow = function(type, id){
		return $('#chat-'+type+'-'+id);
	};
	// Список чатов
	this.chatItem = {};
	// Список не прочитанных сообщений
	//this.notReadMessanges = [];

	// Выводит список чатов
	this.chatList = function(items){
		if (!that.$chatList().length) {
			$('body').append('<div id="chat-list">'+
					'<div class="chat-search">'+
						'<div class="chat-search-icon"><i class="fa fa-search"></i></div>'+
						'<div class="chat-search-field"><input type="text"><div class="chat-search-result"></div></div>'+
					'</div>'+
					'<div id="chat-list-items"></div>'+
				'</div>');
		};		
		if (items) that.chatItems(items);
	};
	this.chatItems = function(items){
		var chatList = that.$chatList();
		for (var key in items) {
			if (typeof items[key].online == 'undefined') items[key].online = false;
			chatList.append('<div class="chat-item" data-id="'+items[key].id+'" data-type="'+items[key].type+'">'+
					'<img class="chat-item-icon" src="/uploads/profile_image/'+items[key].guid+'.jpg">'+
					'<span class="chat-item-close"><i class="fa fa-close"></i></span>'+
					(items[key].online ?
						'<span class="chat-item-online">'+(items[key].type == 'space' ? items[key].online : '')+'</span>' :
						'<span class="chat-item-online ofline"></span>'
					)+
					'<div class="chat-item-title"><b class="chat-item-name">'+items[key].name+'</b><i class="chat-item-description">'+items[key].title+'</i></div>'+
				'</div>');
		}
		that.userIconDefault();
	};
	this.cacheChatItem = function(items){
		if (!Array.isArray(items)) {
			that.chatItem[items.type+items.id] = items;
			return;
		}
		for (var key in items) {
			that.chatItem[items[key].type+items[key].id] = items[key];
		}
	};
	this.addChatItem = function(type, id){
		if (that.$chatItem(type, id).length) return;
		that.chatItems([that.getChatItem(type, id)]);
		
	}
	this.getChatItem = function(type, id){
		return (typeof that.chatItem[type+id] != 'undefined') ? that.chatItem[type+id] : false;
	};
	this.userIconDefault = function(){
		$('.chat-item-icon').bind('error', function(){
			var $item = $(this).closest('[data-type][data-id]');
			if ($item.data('type') == 'space') {
				var item = that.getChatItem($item.data('type'), $item.data('id'));
				var arr = item.name.split(/\s+/);
				$(this).replaceWith('<div class="chat-item-icon" style="background-color: '+item.color+';">'+
					(arr.length > 1 ? arr[0][0]+arr[1][0] : arr[0][0]).toUpperCase()+
					'</div>');
			} else {
				this.src = '/img/chat_default_user.jpg';
			}
			console.log('no chat icon');
		});
	};
	this.searchResult = function(items){
		var resultContener = $('.chat-search-result');
		resultContener.html('');
		if (!items.length) {
			resultContener.append('<div class="chat-search-empty">Чаты не найдены</div>');
			return;
		}
		for (var key in items) {
			resultContener.append('<div class="chat-search-item" data-type="'+items[key].type+'" data-id="'+items[key].id+'">'+
					'<img class="chat-item-icon" src="/uploads/profile_image/'+items[key].guid+'.jpg">'+
					'<div class="chat-search-item-name">'+items[key].name+'</div>'+
					'<div class="chat-search-item-description">'+items[key].title+'</div>'+
				'</div>');
		}
		this.userIconDefault();
	};
	// Открывает окно чата
	this.openChatWindow = function(type, id){
		var $chatWindow = that.$chatWindow(type, id);
		if ($chatWindow.length) {
			$chatWindow.show();
			return;
		}
		that.chatWindow(type, id);
		that.$chatWindow(type, id).find('textarea').focus();
	};
	// Выводит окно чата
	this.chatWindow = function(type, id){
		var item = that.getChatItem(type, id);
		$('body').append('<div id="chat-'+type+'-'+id+'" class="chat-window">'+
				'<div class="chat-head">'+item.name+'</div>'+
				'<div class="chat-content">'+
					'<div class="chat-messages"></div>'+
					'<div class="chat-field"><textarea data-type="'+type+'" data-id="'+id+'"></textarea></div>'+
				'</div>'+
			'</div>');
		that.socket.emit('get.chat-messages', {id: id, type: type});
	};
	// Выводит сообщения в чат
	this.chatMessages = function(messages, append){
		append = typeof append == 'undefined' ? true : append;
		var chats = {};
		for (var key in messages) {
			messages[key].my = (messages[key].user_id == that.userId);
			var chatId = 'chat-'+messages[key].type+'-';
			if (messages[key].type == 'space') chatId += messages[key].object_id;
			else {
				if (messages[key].my) chatId += messages[key].object_id;
				else chatId += messages[key].user_id;
			}
			if (typeof chats[chatId] == 'undefined') {
				chats[chatId] = [];
			}
			chats[chatId].push('<div id="chat-message-'+messages[key].id+'" class="chat-message-wrap'+(messages[key].my ? ' chat-message-my' : '')+(!messages[key].read_at ? ' chat-message-notread' : '')+'" data-id="'+messages[key].id+'">'+
				'<div class="chat-message">'+
					that.renderMessageText(messages[key].text)+
				'</div>');
		}
		for (var key in chats) {
			if (append) {
				$('#'+key+' .chat-messages').append(chats[key]).scrollTop(999999);
			} else {
				$('#'+key+' .chat-messages').prepend(chats[key]);
			}
		}
	};
	this.renderMessageText = function(text){
		return text.replace(/(\r\n|\r|\n)/g, '<br>');
	};
}