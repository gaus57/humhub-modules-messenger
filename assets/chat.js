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
			that.setChatItem(data);
			that.chatList(data);
		})
		.on('message.status', function(data){
			console.log('send message status', data);
			if (data.status) {
				$('#chat-'+data.type+'-'+data.id+' textarea').val('');
			}
		})
		.on('search.chat', function(data){
			that.setChatItem(data);
			that.searchResult(data);
			console.log('search result', data);
		})
		.on('user-id', function(data){
			that.userId = data.id;
		});

	// Регистрируем обработчики событий интерфейса
	$(document)
		.on('click', '#chat-list > .chat-item', function(e){
			var $this = $(this);
			var type = $this.data('type');
			var id = $this.data('id');
			that.openChatWindow(id, type);
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
			that.searchTimeOut = setTimeout(function(){
				that.socket.emit('search.chat', {text: text});
				console.log('search chats', text);
			}, 300);
		})
		.on('click', '.chat-search-result .chat-item', function(e){
			e.stopPropagation();
			var $this = $(this);
			that.addChatItem($this.data('id'), $this.data('type'));
		});

	this.searchTimeOut;

	this.userId;
	this.$chatList;
	this.$chatItem = {};
	this.$chatWindow = {};
	// Список пользователей
	this.chatItem = {};
	// Список не прочитанных сообщений
	//this.notReadMessanges = [];

	// Выводит список чатов
	this.chatList = function(items){
		if (!that.$chatList) {
			that.$chatList = $('<div id="chat-list">'+
				'<div class="chat-search">'+
					'<div class="chat-search-icon"><i class="fa fa-search"></i></div>'+
					'<div class="chat-search-field"><input type="text"><div class="chat-search-result"></div></div>'+
				'</div>'+
				'</div>');
			$('body').append(that.$chatList);
		};		
		if (items) that.chatItems(items, that.$chatList);
	};
	this.chatItems = function(items, list){
		for (var key in items) {
			var html = '<div class="chat-item" data-id="'+items[key].id+'" data-type="'+items[key].type+'">'+
					'<img class="chat-item-icon" src="/uploads/profile_image/'+items[key].guid+'.jpg">'+
					'<div class="chat-item-title"><b class="chat-item-name">'+items[key].name+'</b><i class="chat-item-description">'+items[key].title+'</i></div>'+
				'</div>';
			var $item = $(html);
			if (list == that.$chatList) {
				that.$chatItem[items[key].type+items[key].id] = $item;
			}
			list.append($item);
		}
		that.userIconDefault();
	};
	this.setChatItem = function(items){
		if (!Array.isArray(items)) {
			that.chatItem[items.type+items.id] = items;
			return;
		}
		for (var key in items) {
			that.chatItem[items[key].type+items[key].id] = items[key];
		}
	};
	this.addChatItem = function(id, type){
		if (!id || !type) return false;
		if (typeof that.$chatItem[type+id] != 'undefined') return;
		that.chatItems([that.getChatItem(id, type)], that.$chatList);
		that.socket.emit('add.chat', {id: id, type: type});
	}
	this.getChatItem = function(id, type){
		return (typeof that.chatItem[type+id] != 'undefined') ? that.chatItem[type+id] : false;
	};
	this.userIconDefault = function(){
		$('.chat-item img').bind('error', function(){
			var $item = $(this).closest('.chat-item');
			if ($item.data('type') == 'space') {
				var item = that.getChatItem($item.data('id'), $item.data('type'));
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
		if (items.length) {
			that.chatItems(items, resultContener);
			return;
		}
		resultContener.append('<div class="chat-search-empty">Чаты не найдены</div>');
	};
	// Открывает окно чата
	this.openChatWindow = function(id, type){
		if ($('#chat-'+type+'-'+id).length) {
			$('#chat-'+type+'-'+id).show();
			return;
		}
		that.chatWindow(id, type);
	};
	// Выводит окно чата
	this.chatWindow = function(id, type){	
		var item = that.getChatItem(id, type);
		$('body').append('<div id="chat-'+type+'-'+id+'" class="chat-window">'+
				'<div class="chat-head">'+item.name+'</div>'+
				'<div class="chat-content">'+
					'<div class="chat-messages"></div>'+
					'<form class="chat-field"><textarea data-type="'+type+'" data-id="'+id+'"></textarea></form>'+
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
	};
}