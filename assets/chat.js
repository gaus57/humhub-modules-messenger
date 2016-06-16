var chat;

$(function(){
	chat = new Chat(document.location.origin+':3000');
});

// Конструктор объекта чата
function Chat(serverUrl){
	var that = this;

	this.socket = io(serverUrl);

	this.pageTitle = $('title').text();
	this.newMessages = 0;

	// Запрашиваем список чатов
	that.socket.emit('get.chat-list');

	// Регистрируем слушатели socket.io
	that.socket.on('chat-messages', function(data){
			console.log('message', data);
			that.chatMessages(data.type, data.id, data.items, data.append, data.end);
		})
		.on('chat-list', function(data){
			that.cacheChatItem(data.items);
			console.log('chat list', data);
			that.chatList(data.items);
		})
		.on('notread-messages', function(data){
			that.addNotReadMessages(data.items);
		})
		.on('message.status', function(data){
			console.log('send message status', data);
			if (data.status) {
				that.$chatWindow(data.type, data.id).find('textarea').val('');
			}
		})
		.on('search.chat', function(data){
			that.cacheChatItem(data.items);
			console.log('search result', data);
			that.searchResult(data.items);
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
			that.readMessages(data.items);
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
		})
		.on('wheel', '.chat-messages', function(e){
			var $win = $(this).closest('.chat-window');
			if (e.currentTarget.scrollTop <= 200) that.loadChatMessages($win.data('type'), $win.data('id'));
		});
	$(window)
		.on('blur', function(){
			console.log('page blur');
			that.pageFocus = false;
		})
		.on('focus', function(){
			console.log('page focus');
			that.pageFocus = true;
			if (that.newMessages) {
				that.newMessages = 0;
				$('title').text(that.pageTitle);
			}
		});

	this.searchTimeOut;
	
	this.pageFocus = false;
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
	// Открытые окна чатов
	this.chatWindows = {};
	// Результаты поиска
	this.searchResults = {};

	this.addNewMessages = function(count){
		if (!that.pageFocus && count) {
			that.newMessages += count;
			$('title').text('Сообщений '+that.newMessages+'. '+that.pageTitle);
		}
	};
	this.loadChatMessages = function(type, id){
		if (that.chatWindows[type+'-'+id].end || that.chatWindows[type+'-'+id].load) return;
		that.chatWindows[type+'-'+id].load = true;
		var last = null;
		if (that.chatWindows[type+'-'+id].messages.length) {
			last = that.chatWindows[type+'-'+id].messages[0].id;
		}
		console.log('get load msgs', last);
		that.socket.emit('get.chat-messages', {id: id, type: type, last: last});
	};
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
		that.addNewMessages(items.length);
		console.log('not read messages', items);
	};
	this.renderNotReadMessages = function(){
		$('.chat-notread-info').remove();
		$('.chat-notread-items').html('');
		var countAll = 0;
		for (var key in that.notReadMessages) {
			var chatMsgs = that.notReadMessages[key];
			var keyArr = key.split('-');
			var count = 0;
			var msg;
			for (var n in chatMsgs) {
				msg = chatMsgs[n];
				count++;
				countAll++;				
			}
			if (!count) continue;
			if (msg.type == 'user') {
				if ($('.chat-notread-item[data-type='+msg.type+'][data-id='+msg.user.id+']').length) continue;
				$('.chat-notread-items').append('<div class="chat-notread-item" data-id="'+msg.user.id+'" data-type="'+msg.type+'">'+
						'<img class="chat-item-icon" src="/uploads/profile_image/'+msg.user.guid+'.jpg">'+
						(msg.user.online ?
							'<span class="chat-item-online"></span>' :
							'<span class="chat-item-online ofline"></span>'
						)+
						'<span class="chat-notread-info">'+count+'</span>'+
						'<div class="chat-item-title"><b class="chat-item-name">'+msg.user.name+'</b><i class="chat-item-description">'+msg.user.title+'</i></div>'+
					'</div>');
			} else {
				if ($('.chat-notread-item[data-type='+msg.type+'][data-id='+msg.object.id+']').length) continue;
				$('.chat-notread-items').append('<div class="chat-notread-item" data-id="'+msg.object.id+'" data-type="'+msg.type+'">'+
						'<img class="chat-item-icon" src="/uploads/profile_image/'+msg.object.guid+'.jpg">'+
						(msg.object.online ?
							'<span class="chat-item-online">'+msg.object.online+'</span>' :
							'<span class="chat-item-online ofline"></span>'
						)+
						'<span class="chat-notread-info">'+count+'</span>'+
						'<div class="chat-item-title"><b class="chat-item-name">'+msg.object.name+'</b><i class="chat-item-description">'+msg.object.title+'</i></div>'+
					'</div>');
			}
			var $item = that.$chatItem(keyArr[0], keyArr[1]);
			if (!$item.length) continue;
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
			that.chatWindows[type+'-'+id] = {chat: that.getChatItem(type, id), messages: []};
			that.renderChatWindow(type, id);
			that.socket.emit('get.chat-messages', {id: id, type: type});
		}
		$chatWindow.show();
		that.$chatWindow(type, id).find('textarea').focus();
	};
	// Выводит окно чата
	this.renderChatWindow = function(type, id){
		var item = that.getChatItem(type, id);
		$('body').append('<div id="chat-'+type+'-'+id+'" class="chat-window chat-'+type+'" data-type="'+type+'" data-id="'+id+'">'+
				'<div class="chat-head">'+item.name+'</div>'+
				'<div class="chat-content">'+
					'<div class="chat-messages"></div>'+
					'<div class="chat-field"><textarea class="chat-send" data-type="'+type+'" data-id="'+id+'"></textarea></div>'+
				'</div>'+
			'</div>');
	};
	// Выводит сообщения в чат
	this.chatMessages = function(type, id, messages, append, isEnd){
		append = typeof append == 'undefined' ? true : append;
		var notRead = [];
		var html = '';
		for (var key in messages) {
			messages[key].my = (messages[key].user_id == that.userId);
			if (!id) id = messages[key].my ? messages[key].object_id : messages[key].user_id;
			// если не прочитано добавляем в список непрочитанных
			if (!messages[key].my && !messages[key].read_at) notRead.push(messages[key]);
			if (!that.chatWindows[type+'-'+id]) continue;
			if (messages[key].type == 'user') {
				html += '<div id="chat-message-'+messages[key].id+'" class="chat-message-wrap'+(messages[key].my ? ' chat-message-my' : '')+((!messages[key].read_at && messages[key].my && messages[key].type == 'user') ? ' chat-message-notread' : '')+'" data-id="'+messages[key].id+'">'+
						'<img class="chat-item-icon" src="/uploads/profile_image/'+messages[key].user.guid+'.jpg">'+
						'<div class="chat-message">'+
							'<span class="chat-msg-text">'+that.renderMessageText(messages[key].text)+'</span>'+
							'<span class="chat-msg-time" data-time="'+messages[key].created_at+'">'+that.dateFormat(messages[key].created_at)+'</span>'+
						'</div>'+
					'</div>';
			} else {
				html += '<div id="chat-message-'+messages[key].id+'" class="chat-message-wrap'+(messages[key].my ? ' chat-message-my' : '')+((!messages[key].read_at && messages[key].my && messages[key].type == 'user') ? ' chat-message-notread' : '')+'" data-id="'+messages[key].id+'">'+
						'<img class="chat-item-icon" src="/uploads/profile_image/'+messages[key].user.guid+'.jpg">'+
						'<div class="chat-message">'+
							'<span class="chat-msg-text">'+that.renderMessageText(messages[key].text)+'</span>'+
							'<span class="chat-msg-time" data-time="'+messages[key].created_at+'">'+that.dateFormat(messages[key].created_at)+'</span>'+
						'</div>'+
					'</div>';
			}
		}
		console.log(notRead.length, notRead);
		if (notRead.length) this.addNotReadMessages(notRead);

		var $chatMessags = that.$chatWindow(type, id).find('.chat-messages');
		console.log($chatMessags);
		if (that.chatWindows[type+'-'+id]) {
			if (append) {
				that.chatWindows[type+'-'+id].messages = that.chatWindows[type+'-'+id].messages.concat(messages);
				$chatMessags.append(html).scrollTop(999999);
			} else {
				that.chatWindows[type+'-'+id].messages = [].concat(messages, that.chatWindows[type+'-'+id].messages);
				var scrollBottom = $chatMessags[0].scrollHeight - $chatMessags[0].scrollTop;
				$chatMessags.prepend(html);
				$chatMessags.scrollTop($chatMessags[0].scrollHeight - scrollBottom);
				console.log('scroll ', $chatMessags[0].scrollHeight, scrollBottom);
			}
			that.userIconDefault();
			if (isEnd != 'undefined') {
				that.chatWindows[type+'-'+id].end = isEnd;
				that.chatWindows[type+'-'+id].load = false;
			}
		}
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