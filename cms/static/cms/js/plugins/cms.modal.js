/*##################################################|*/
/* #CMS# */
(function($) {
// CMS.$ will be passed for $
$(document).ready(function () {
	/*!
	 * Modal
	 * Controls a cms specific modal
	 */
	CMS.Modal = new CMS.Class({

		implement: [CMS.API.Helpers],

		options: {
			'modalDuration': 300,
			'urls': {
				'css_modal': 'cms/css/plugins/cms.toolbar.modal.css'
			},
			'minHeight': 400,
			'minWidth': 600,
			'onClose': false
		},

		initialize: function (options) {
			this.options = $.extend(true, {}, this.options, options);
			this.config = CMS.config;

			// elements
			this.body = $('html');
			this.modal = $('.cms_modal');
			this.toolbar = $('.cms_toolbar');

			// states
			this.click = (document.ontouchstart !== null) ? 'click.cms' : 'touchend.cms';
			this.maximized = false;
			this.minimized = false;
			this.enforceReload = false;
			this.enforceClose = false;

			// if the modal is initialized the first time, set the events
			if(!this.modal.data('ready')) this._events();

			// ready modal
			this.modal.data('ready', true);
		},

		// initial methods
		_events: function () {
			var that = this;

			// attach events to window
			this.modal.find('.cms_modal-collapse').bind(this.click, function (e) {
				e.preventDefault();
				that._minimize();
			});
			this.modal.find('.cms_modal-title').bind('mousedown.cms', function (e) {
				e.preventDefault();
				that._startMove(e);
			});
			this.modal.find('.cms_modal-resize').bind('mousedown.cms', function (e) {
				e.preventDefault();
				that._startResize(e);
			});
			this.modal.find('.cms_modal-maximize').bind(this.click, function (e) {
				e.preventDefault();
				that._maximize();
			});
			this.modal.find('.cms_modal-breadcrumb-items').on(this.click, 'a', function (e) {
				e.preventDefault();
				that._changeContent($(this));
			});
			this.modal.find('.cms_modal-close, .cms_modal-cancel').bind(this.click, function (e) {
				e.preventDefault();
				that.close();
			});

			// stopper events
			$(document).bind('mouseup.cms', function (e) {
				that._endMove(e);
				that._endResize(e);
			});
		},

		// public methods
		open: function (url, name, breadcrumb) {
			// show loader
			CMS.API.Toolbar._loader(true);

			// hide tooltip
			this.hideTooltip();

			// reset breadcrumb
			this.modal.find('.cms_modal-breadcrumb').hide();
			this.modal.find('.cms_modal-breadcrumb-items').html('');

			// empty buttons
			this.modal.find('.cms_modal-buttons').html('');

			var contents = this.modal.find('.cms_modal-body, .cms_modal-foot');
				contents.show();

			this._loadContent(url, name);

			// insure modal is not maximized
			if(this.modal.find('.cms_modal-collapsed').length) this._minimize();

			// reset styles
			this.modal.css({
				'left': '50%',
				'top': '50%',
				'mergin-left': 0,
				'margin-right': 0
			});
			// lets set the modal width and height to the size of the browser
			var widthOffset = 300;
			var heightOffset = 350;
			var width = ($(window).width() >= this.options.minWidth + widthOffset) ? $(window).width() - widthOffset : this.options.minWidth;
			var height = ($(window).height() >= this.options.minHeight + heightOffset) ? $(window).height() - heightOffset : this.options.minHeight;
			this.modal.find('.cms_modal-body').css({
				'width': width,
				'height': height
			});
			this.modal.find('.cms_modal-body').removeClass('cms_loader');
			this.modal.find('.cms_modal-maximize').removeClass('cms_modal-maximize-active');
			this.maximized = false;

			// we need to render the breadcrumb
			this._setBreadcrumb(breadcrumb);

			// display modal
			this._show(this.options.modalDuration);
		},

		close: function () {
			this._hide(100);
			if(this.options.onClose === 'REFRESH_PAGE') this.reloadBrowser();
		},

		// private methods
		_show: function (speed) {
			// we need to position the modal in the center
			var that = this;
			var width = this.modal.width();
			var height = this.modal.height();

			// animates and sets the modal
			this.modal.show().css({
				'width': 0,
				'height': 0,
				'margin-left': 0,
				'margin-top': 0
			}).stop(true, true).animate({
				'width': width,
				'height': height,
				'margin-left': -(width / 2),
				'margin-top': -(height / 2)
			}, speed, function () {
				$(this).removeAttr('style');

				that.modal.css({
					'margin-left': -(width / 2),
					'margin-top': -(height / 2)
				});

				// fade in modal window
				that.modal.show();

				// hide loader
				CMS.API.Toolbar._loader(false);
			});

			// prevent scrolling
			this.preventScroll(true);

			// add esc close event
			$(document).bind('keydown.cms', function (e) {
				if(e.keyCode === 27) that.close();
			});

			// set focus to modal
			this.modal.focus();
		},

		_hide: function (speed) {
			this.modal.fadeOut(speed);
			this.modal.find('.cms_modal-frame iframe').remove();
			this.modal.find('.cms_modal-body').removeClass('cms_loader');
			// prevent scrolling
			this.preventScroll(false);
		},

		_minimize: function () {
			var trigger = this.modal.find('.cms_modal-collapse');
			var contents = this.modal.find('.cms_modal-body, .cms_modal-foot');

			// cancel action if maximized
			if(this.maximized) return false;

			if(this.minimized === false) {
				// minimize
				trigger.addClass('cms_modal-collapsed');
				contents.hide();

				// save initial state
				this.modal.data('css', {
					'left': this.modal.css('left'),
					'top': this.modal.css('top'),
					'margin': this.modal.css('margin')
				});

				this.modal.css({
					'left': this.toolbar.find('.cms_toolbar-left').outerWidth(true) + 50,
					'top': (this.config.debug) ? 6 : 1,
					'margin': 0
				});

				// enable scrolling
				this.body.css('overflow', '');

				this.minimized = true;
			} else {
				// minimize
				trigger.removeClass('cms_modal-collapsed');
				contents.show();

				// reattach css
				this.modal.css(this.modal.data('css'));

				// disable scrolling
				this.body.css('overflow', 'hidden');

				this.minimized = false;
			}
		},

		_maximize: function () {
			var debug = (this.config.debug) ? 5 : 0;
			var container = this.modal.find('.cms_modal-body');
			var trigger = this.modal.find('.cms_modal-maximize');

			// cancel action when minimized
			if(this.minimized) return false;

			if(this.maximized === false) {
				// maximize
				this.maximized = true;
				trigger.addClass('cms_modal-maximize-active');

				this.modal.data('css', {
					'left': this.modal.css('left'),
					'top': this.modal.css('top'),
					'margin-left': this.modal.css('margin-left'),
					'margin-top': this.modal.css('margin-top')
				});
				container.data('css', {
					'width': container.width(),
					'height': container.height()
				});

				// reset
				this.modal.css({
					'left': 0,
					'top': debug,
					'margin': 0
				});
				// bind resize event
				$(window).bind('resize.cms.modal', function () {
					container.css({
						'width': $(window).width(),
						'height': $(window).height() - 60 - debug
					});
				});
				$(window).trigger('resize.cms.modal');
			} else {
				// minimize
				this.maximized = false;
				trigger.removeClass('cms_modal-maximize-active');

				$(window).unbind('resize.cms.modal');

				// reattach css
				this.modal.css(this.modal.data('css'));
				container.css(container.data('css'));
			}
		},

		_startMove: function (initial) {
			// cancel if maximized
			if(this.maximized) return false;
			// cancel action when minimized
			if(this.minimized) return false;

			var that = this;
			var position = that.modal.position();

			this.modal.find('.cms_modal-shim').show();

			$(document).bind('mousemove.cms', function (e) {
				var left = position.left - (initial.pageX - e.pageX) - $(window).scrollLeft();
				var top = position.top - (initial.pageY - e.pageY) - $(window).scrollTop();

				that.modal.css({
					'left': left,
					'top': top
				});
			});
		},

		_endMove: function () {
			this.modal.find('.cms_modal-shim').hide();

			$(document).unbind('mousemove.cms');
		},

		_startResize: function (initial) {
			// cancel if in fullscreen
			if(this.maximized) return false;
			// continue
			var that = this;
			var container = this.modal.find('.cms_modal-body');
			var width = container.width();
			var height = container.height();
			var modalLeft = this.modal.position().left;
			var modalTop = this.modal.position().top;

			this.modal.find('.cms_modal-shim').show();

			$(document).bind('mousemove.cms', function (e) {
				var mvX = initial.pageX - e.pageX;
				var mvY = initial.pageY - e.pageY;

				var w = width - (mvX * 2);
				var h = height - (mvY * 2);
				var max = 680;

				// add some limits
				if(w <= max || h <= 100) return false;

				// set centered animation
				container.css({
					'width': width - (mvX * 2),
					'height': height - (mvY * 2)
				});
				that.modal.css({
					'left': modalLeft + mvX,
					'top': modalTop + mvY - $(window).scrollTop()
				});
			});
		},

		_endResize: function () {
			this.modal.find('.cms_modal-shim').hide();

			$(document).unbind('mousemove.cms');
		},

		_setBreadcrumb: function (breadcrumb) {
			var bread = this.modal.find('.cms_modal-breadcrumb');
			var crumb = '';

			// cancel if there is no breadcrumb)
			if(!breadcrumb || breadcrumb.length <= 0) return false;
			if(!breadcrumb[0].title) return false;

			// load breadcrumb
			$.each(breadcrumb, function (index, item) {
				// check if the item is the last one
				var last = (index >= breadcrumb.length - 1) ? 'cms_modal-breadcrumb-last' : '';
				// render breadcrumb
				crumb += '<a href="' + item.url + '" class="' + last + '"><span>' + item.title + '</span></a>';
			});

			// attach elements
			bread.find('.cms_modal-breadcrumb-items').html(crumb);

			// show breadcrumb
			bread.show();
		},

		_setButtons: function (iframe) {
			var that = this;
			var row = iframe.contents().find('.submit-row:eq(0)');
			var buttons = row.find('input, a');
			var render = $('<span />'); // seriously jquery...

			// if there are no buttons, try again
			if(!buttons.length) {
				row = iframe.contents().find('form:eq(0)');
				buttons = row.find('input[type="submit"]');
				buttons.attr('name', '_save')
					.addClass('deletelink')
					.hide();
				this.enforceReload = true;
			} else {
				this.enforceReload = false;
			}

			// attach relation id
			buttons.each(function (index, item) {
				$(item).attr('data-rel', '_' + index);
			});

			// loop over input buttons
			buttons.each(function (index, item) {
				item = $(item);

				// cancel if item is a hidden input
				if(item.attr('type') === 'hidden') return false;

				// create helper variables
				var title = item.attr('value') || item.text();
				var cls = 'cms_btn';

				// set additional special css classes
				if(item.hasClass('default')) cls = 'cms_btn cms_btn-action';
				if(item.hasClass('deletelink')) cls = 'cms_btn cms_btn-caution';

				// create the element
				var el = $('<div class="'+cls+' '+item.attr('class')+'">'+title+'</div>');
					el.bind(that.click, function () {
						if(item.is('input')) item.click();
						if(item.is('a')) that._loadContent(item.attr('href'), title);

						// trigger only when blue action buttons are triggered
						if(item.hasClass('default') || item.hasClass('deletelink')) {
							that.enforceClose = true;
						} else {
							that.enforceClose = false;
						}

						// hide iframe again
						that.modal.find('iframe').hide();
					});

				// append element
				render.append(el);
			});

			// manually add cancel button at the end
			var cancel = $('<div class="cms_btn">'+that.config.lang.cancel+'</div>');
				cancel.bind(that.click, function () {
					that.close();
				});
			render.append(cancel);

			// unwrap helper and ide row
			row.hide();

			// render buttons
			this.modal.find('.cms_modal-buttons').html(render);
		},

		_loadContent: function (url, name) {
			var that = this;

			// now refresh the content
			var iframe = $('<iframe src="'+url+'" class="" frameborder="0" />');
				iframe.css('visibility', 'hidden');
			var holder = this.modal.find('.cms_modal-frame');

			// set correct title
			var title = this.modal.find('.cms_modal-title');
				title.html(name || '&nbsp;');

			// insure previous iframe is hidden
			holder.find('iframe').css('visibility', 'hidden');

			// attach load event for iframe to prevent flicker effects
			iframe.bind('load', function () {
				// show messages in toolbar if provided
				var messages = iframe.contents().find('.messagelist li');
					if(messages.length) CMS.API.Toolbar.openMessage(messages.eq(0).text());
					messages.remove();

				// determine if we should close the modal or reload
				if(messages.length && that.enforceReload) that.reloadBrowser();
				if(messages.length && that.enforceClose) {
					that.close();
					return false;
				}

				// after iframe is loaded append css
				iframe.contents().find('head').append($('<link rel="stylesheet" type="text/css" href="' + that.config.urls.static + that.options.urls.css_modal + '" />'));

				// set title of not provided
				var innerTitle = iframe.contents().find('#content h1:eq(0)');
				if(name === undefined) title.html(innerTitle.text());
				innerTitle.remove();

				// set modal buttons
				that._setButtons($(this));

				// than show
				iframe.css('visibility','visible');

				// append ready state
				iframe.data('ready', true);

				// attach close event
				iframe.contents().find('body').bind('keydown.cms', function (e) {
					if(e.keyCode === 27) that.close();
				});
			});

			// inject
			setTimeout(function () {
				that.modal.find('.cms_modal-body').addClass('cms_loader');
				holder.html(iframe);
			}, this.options.modalDuration);
		},

		_changeContent: function (el) {
			if(el.hasClass('cms_modal-breadcrumb-last')) return false;

			var parents = el.parent().find('a');
				parents.removeClass('cms_modal-breadcrumb-last');

			el.addClass('cms_modal-breadcrumb-last');

			this._loadContent(el.attr('href'));

			// update title
			this.modal.find('.cms_modal-title').text(el.text());
		}

	});

});
})(CMS.$);
