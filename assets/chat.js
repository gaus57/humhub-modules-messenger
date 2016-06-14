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
			console.log('chat list', data);
			that.chatList(data);
		})
		.on('notread-messages', function(data){
			that.addNotReadMessages(data);
		})
		.on('message.status', function(data){
			console.log('send message status', data);
			if (data.status) {
				that.$chatWindow(data.type, data.id).find('textarea').val('');
			}
		})
		.on('search.chat', function(data){
			that.cacheChatItem(data);
			console.log('search result', data);
			that.searchResult(data);
		})
		.on('user-id', function(data){
			that.userId = data.id;
		})
		.on('add.chat-status', function(data){
			if (data.status) {
				console.log('add chat', data);
				that.addChatItem(data.type, data.id);
			}
		})
		.on('chat.ofline', function(data){
			that.chatOfline(data.type, data.id);
		})
		.on('chat.online', function(data){
			that.chatOnline(data.type, data.id);
		})
		.on('messages.read', function(data){
			that.readMessages(data);
		});

	// Регистрируем обработчики событий интерфейса
	$(document)
		.on('click', '.chat-item, .chat-notread-item', function(e){
			var $this = $(this);
			that.openChatWindow($this.data('type'), $this.data('id'));
		})
		.on('keydown', '.chat-field textarea', function(e){
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
		    var container = $(".chat-notread-icon");
		    if (!container.is(e.target) && container.has(e.target).length === 0) {
		        $(".chat-notread-items").hide();
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
				console.log('search chats', text);
				that.socket.emit('search.chat', {text: text});
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
		})
		.on('focus', '.chat-send', function(){
			var $this = $(this);
			that.readChatMessages($this.data('type'), $this.data('id'));
		})
		.on('click', '.chat-notread-icon', function(){
			$('.chat-notread-items').toggle();
		})
		.on('wheel', '#chat-list-items', function(e){
			e.preventDefault();
			that.scrollChatList(e.originalEvent.deltaY);
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
	this.notReadMessages = {};

	this.scrollChatList = function(scroll){
		var $this = that.$chatList();
		var $parent = $this.parent();
		var margin = Number($this.css('margin-top').replace('px', ''));
		var blockHeight = $parent.outerHeight();
		var contentHeight = $this.outerHeight();
		if (contentHeight <= blockHeight) return;
		var newMargin = margin - scroll;
		if (newMargin-blockHeight < -contentHeight) newMargin = -(contentHeight-blockHeight);
		if (newMargin > 0) newMargin = 0;
		$this.css('margin-top', newMargin+'px');
		if (newMargin < 0) {
			$('.chat-items-contener').addClass('chat-scroll-top');
		} else {
			$('.chat-items-contener').removeClass('chat-scroll-top');
		}
		if (newMargin-blockHeight > -contentHeight) {
			$('.chat-items-contener').addClass('chat-scroll-bottom');
		} else {
			$('.chat-items-contener').removeClass('chat-scroll-bottom');
		}
		console.log(blockHeight, contentHeight, margin, newMargin);
	};
	this.addNotReadMessages = function(items){
		for (var key in items) {
			var chatKey = items[key].type == 'user' ?
				items[key].type+'-'+items[key].user_id :
				items[key].type+'-'+items[key].object_id;
			if (!that.notReadMessages[chatKey]) {
				that.notReadMessages[chatKey] = [];
			}
			that.notReadMessages[chatKey][items[key].id] = items[key];
		}
		that.renderNotReadMessages();
		console.log('not read messages', items);
	};
	this.renderNotReadMessages = function(){
		$('.chat-notread-info').remove();
		var countAll = 0;
		for (var key in that.notReadMessages) {
			var chatMsgs = that.notReadMessages[key];
			var keyArr = key.split('-');
			var count = 0;
			for (var n in chatMsgs) {
				count++;
				countAll++;
				if (count > 1) continue;
				if (chatMsgs[n].type == 'user') {
					if ($('.chat-notread-item[data-type='+chatMsgs[n].type+'][data-id='+chatMsgs[n].user.id+']').length) continue;
					$('.chat-notread-items').append('<div class="chat-notread-item" data-id="'+chatMsgs[n].user.id+'" data-type="'+chatMsgs[n].type+'">'+
							'<img class="chat-item-icon" src="/uploads/profile_image/'+chatMsgs[n].user.guid+'.jpg">'+
							(chatMsgs[n].user.online ?
								'<span class="chat-item-online"></span>' :
								'<span class="chat-item-online ofline"></span>'
							)+
							'<div class="chat-item-title"><b class="chat-item-name">'+chatMsgs[n].user.name+'</b><i class="chat-item-description">'+chatMsgs[n].user.title+'</i></div>'+
						'</div>');
				} else {
					if ($('.chat-notread-item[data-type='+chatMsgs[n].type+'][data-id='+chatMsgs[n].object.id+']').length) continue;
					$('.chat-notread-items').append('<div class="chat-notread-item" data-id="'+chatMsgs[n].object.id+'" data-type="'+chatMsgs[n].type+'">'+
							'<img class="chat-item-icon" src="/uploads/profile_image/'+chatMsgs[n].object.guid+'.jpg">'+
							(chatMsgs[n].object.online ?
								'<span class="chat-item-online">'+chatMsgs[n].object.online+'</span>' :
								'<span class="chat-item-online ofline"></span>'
							)+
							'<div class="chat-item-title"><b class="chat-item-name">'+chatMsgs[n].object.name+'</b><i class="chat-item-description">'+chatMsgs[n].object.title+'</i></div>'+
						'</div>');
				}
			}
			var $item = that.$chatItem(keyArr[0], keyArr[1]);
			if (!$item.length || !n) continue;
			$item.append('<span class="chat-notread-info">'+count+'</span>');
		}
		if (countAll) {
			that.userIconDefault();
			$('#chat-notread .chat-notread-count').text(countAll);
			$('#chat-notread').show();
		} else {
			$('#chat-notread').hide();
		}
	};
	this.readChatMessages = function(type, id){
		if (!that.notReadMessages[type+'-'+id]) return;
		var items = [];
		for (key in that.notReadMessages[type+'-'+id]) {
			var msg = that.notReadMessages[type+'-'+id][key];
			items.push({id: msg.id, type: msg.type, object_id: msg.object_id, user_id: msg.user_id});
			delete that.notReadMessages[type+'-'+id][key];
		}
		that.socket.emit('messages.read', items);
		that.$chatWindow(type, id).find('.chat-message-notread').removeClass('chat-message-notread');
		that.renderNotReadMessages();
		console.log('read', items);
	};
	this.readMessages = function(items){
		for (var key in items) {
			$('#chat-message-'+items[key].id).removeClass('chat-message-notread');
		}
		console.log('read messages', items);
	};
	// Выводит список чатов
	this.chatList = function(items){
		if (!that.$chatList().length) {
			$('body').append('<div id="chat-list">'+
					'<div id="chat-notread">'+
						'<div class="chat-notread-icon"><i class="fa fa-envelope"></i><span class="chat-notread-count"></span></div>'+
						'<div class="chat-notread-items"></div>'+
					'</div>'+
					'<div class="chat-search">'+
						'<div class="chat-search-icon"><i class="fa fa-search"></i></div>'+
						'<div class="chat-search-field"><input type="text"><div class="chat-search-result"></div></div>'+
					'</div>'+
					'<div class="chat-items-contener"><div id="chat-list-items"></div></div>'+
				'</div>');
		};		
		if (items.length) {
			that.$chatList().show();
			that.chatItems(items);
		}
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
		that.renderNotReadMessages();
		that.scrollChatList(0);
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
		if (!$chatWindow.length) {
			that.chatWindow(type, id);
		}
		$chatWindow.show();
		that.$chatWindow(type, id).find('textarea').focus();
	};
	// Выводит окно чата
	this.chatWindow = function(type, id){
		var item = that.getChatItem(type, id);
		$('body').append('<div id="chat-'+type+'-'+id+'" class="chat-window chat-'+type+'">'+
				'<div class="chat-head">'+item.name+'</div>'+
				'<div class="chat-content">'+
					'<div class="chat-messages"></div>'+
					'<div class="chat-field"><textarea class="chat-send" data-type="'+type+'" data-id="'+id+'"></textarea></div>'+
				'</div>'+
			'</div>');
		that.socket.emit('get.chat-messages', {id: id, type: type});
	};
	// Выводит сообщения в чат
	this.chatMessages = function(messages, append){
		append = typeof append == 'undefined' ? true : append;
		var chats = {};
		var notRead = [];
		var now = new Date;
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
			if (messages[key].type == 'user') {
				var msgBlock = '<div id="chat-message-'+messages[key].id+'" class="chat-message-wrap'+(messages[key].my ? ' chat-message-my' : '')+((!messages[key].read_at && messages[key].my && messages[key].type == 'user') ? ' chat-message-notread' : '')+'" data-id="'+messages[key].id+'">'+
						'<img class="chat-item-icon" src="/uploads/profile_image/'+messages[key].user.guid+'.jpg">'+
						'<div class="chat-message">'+
							'<span class="chat-msg-text">'+that.renderMessageText(messages[key].text)+'</span>'+
							'<span class="chat-msg-time">'+that.dateFormat(messages[key].created_at)+'</span>'+
						'</div>'+
					'</div>';
			} else {
				var msgBlock = '<div id="chat-message-'+messages[key].id+'" class="chat-message-wrap'+(messages[key].my ? ' chat-message-my' : '')+((!messages[key].read_at && messages[key].my && messages[key].type == 'user') ? ' chat-message-notread' : '')+'" data-id="'+messages[key].id+'">'+
						'<img class="chat-item-icon" src="/uploads/profile_image/'+messages[key].user.guid+'.jpg">'+
						'<div class="chat-message">'+
							'<span class="chat-msg-text">'+that.renderMessageText(messages[key].text)+'</span>'+
							'<span class="chat-msg-time">'+that.dateFormat(messages[key].created_at)+'</span>'+
						'</div>'+
					'</div>';
			}
			chats[chatId].push(msgBlock);
			// если не прочитано добавляем в список непрочитанных
			if (!messages[key].my && !messages[key].read_at) notRead.push(messages[key]);
		}
		for (var key in chats) {
			if (append) {
				$('#'+key+' .chat-messages').append(chats[key]).scrollTop(999999);
			} else {
				$('#'+key+' .chat-messages').prepend(chats[key]);
			}
		}
		that.userIconDefault();
		console.log(notRead.length, notRead);
		if (notRead.length) this.addNotReadMessages(notRead);
	};
	this.renderMessageText = function(text){
		return text.replace(/(\r\n|\r|\n)/g, '<br>');
	};
	this.chatOflineTimer = {};
	this.chatOfline = function(type, id){
		var item = that.$chatItem(type, id);
		if (!item.length) return;
		that.chatOflineTimer[type+id] = setTimeout(function(){
			item.find('.chat-item-online').addClass('ofline');
		}, 2000);
	};
	this.chatOnline = function(type, id){
		if (that.chatOflineTimer[type+id]) clearTimeout(that.chatOflineTimer[type+id]);
		var item = that.$chatItem(type, id);
		if (!item.length) return;
		item.find('.chat-item-online').removeClass('ofline');
	};
	this.dateFormat = function(dateString){
		var date = new Date(dateString);
		var now = new Date();
		var dateResult = '';
		if (now.getDate()+'.'+now.getMonth()+'.'+now.getFullYear() == date.getDate()+'.'+date.getMonth()+'.'+date.getFullYear()) {
			dateResult += date.getHours() >= 10 ? date.getHours() : '0'+date.getHours();
			dateResult += ':';
			dateResult += date.getMinutes() >= 10 ? date.getMinutes() : '0'+date.getMinutes();
		} else {
			dateResult += date.getDate() >= 10 ? date.getDate() : '0'+date.getDate();
			dateResult += '.';
			dateResult += date.getMonth() >= 10 ? date.getMonth() : '0'+date.getMonth();
			dateResult += '.';
			dateResult += (date.getFullYear()+'').substr(2);
		}
		return dateResult;
	};
}