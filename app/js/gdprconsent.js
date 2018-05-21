(function(gc) {
  // stop from running again, if accidentally included more than once.
  if (gc.hasInitialised) return;

  var util = {
    // http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
    escapeRegExp: function(str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    },

    hasClass: function(element, selector) {
      var s = ' ';
      return element.nodeType === 1 &&
        (s + element.className + s).replace(/[\n\t]/g, s).indexOf(s + selector + s) >= 0;
    },

    addClass: function(element, className) {
      element.className += ' ' + className;
    },

    removeClass: function(element, className) {
      var regex = new RegExp('\\b' + this.escapeRegExp(className) + '\\b');
      element.className = element.className.replace(regex, '');
    },

    interpolateString: function(str, callback) {
      var marker = /{{([a-z][a-z0-9\-_]*)}}/ig;
      return str.replace(marker, function() {
        return callback(arguments[1]) || '';
      })
    },

    getCookie: function(name) {
      var value = '; ' + document.cookie;
      var parts = value.split('; ' + name + '=');
      return parts.length != 2 ?
        undefined : parts.pop().split(';').shift();
    },

    setCookie: function(name, value, expiryDays, domain, path) {
      var exdate = new Date();
      exdate.setDate(exdate.getDate() + (expiryDays || 365));

      var cookie = [
        name + '=' + value,
        'expires=' + exdate.toUTCString(),
        'path=' + (path || '/')
      ];

      if (domain) {
        cookie.push('domain=' + domain);
      }
      document.cookie = cookie.join(';');
    },

    // only used for extending the initial options
    deepExtend: function(target, source) {
      for (var prop in source) {
        if (source.hasOwnProperty(prop)) {
          if (prop in target && this.isPlainObject(target[prop]) && this.isPlainObject(source[prop])) {
            this.deepExtend(target[prop], source[prop]);
          } else {
            target[prop] = source[prop];
          }
        }
      }
      return target;
    },

    // only used for throttling the 'mousemove' event (used for animating the revoke button when `animateRevokable` is true)
    throttle: function(callback, limit) {
      var wait = false;
      return function() {
        if (!wait) {
          callback.apply(this, arguments);
          wait = true;
          setTimeout(function() {
            wait = false;
          }, limit);
        }
      }
    },

    // only used for hashing json objects (used for hash mapping palette objects, used when custom colours are passed through JavaScript)
    hash: function(str) {
      var hash = 0,
        i, chr, len;
      if (str.length === 0) return hash;
      for (i = 0, len = str.length; i < len; ++i) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
      }
      return hash;
    },

    normaliseHex: function(hex) {
      if (hex[0] == '#') {
        hex = hex.substr(1);
      }
      if (hex.length == 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      return hex;
    },

    // used to get text colors if not set
    getContrast: function(hex) {
      hex = this.normaliseHex(hex);
      var r = parseInt(hex.substr(0, 2), 16);
      var g = parseInt(hex.substr(2, 2), 16);
      var b = parseInt(hex.substr(4, 2), 16);
      var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return (yiq >= 128) ? '#000' : '#fff';
    },

    // used to change color on highlight
    getLuminance: function(hex) {
      var num = parseInt(this.normaliseHex(hex), 16), 
          amt = 38,
          R = (num >> 16) + amt,
          B = (num >> 8 & 0x00FF) + amt,
          G = (num & 0x0000FF) + amt;
      var newColour = (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
      return '#'+newColour;
    },

    isMobile: function() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    isPlainObject: function(obj) {
      // The code "typeof obj === 'object' && obj !== null" allows Array objects
      return typeof obj === 'object' && obj !== null && obj.constructor == Object;
    },
  };

  // valid cookie values
  gc.status = {
    deny: 'deny',
    allow: 'allow'
  };

  // detects the `transitionend` event name
  gc.transitionEnd = (function() {
    var el = document.createElement('div');
    var trans = {
      t: "transitionend",
      OT: "oTransitionEnd",
      msT: "MSTransitionEnd",
      MozT: "transitionend",
      WebkitT: "webkitTransitionEnd",
    };

    for (var prefix in trans) {
      if (trans.hasOwnProperty(prefix) && typeof el.style[prefix + 'ransition'] != 'undefined') {
        return trans[prefix];
      }
    }
    return '';
  }());

  gc.hasTransition = !!gc.transitionEnd;

  // array of valid regexp escaped statuses
  var __allowedStatuses = Object.keys(gc.status).map(util.escapeRegExp);

  // contains references to the custom <style> tags
  gc.customStyles = {};

  gc.Popup = (function() {

    var defaultOptions = {

      // if false, this prevents the popup from showing (useful for giving to control to another piece of code)
      enabled: true,

      // optional (expecting a HTML element) if passed, the popup is appended to this element. default is `document.body`
      container: null,

      tcs: false,

      // defaults cookie options - it is RECOMMENDED to set these values to correspond with your server
      cookie: {
        // This is the name of this cookie - you can ignore this
        name: 'gdprconsent_status',

        // This is the url path that the cookie 'name' belongs to. The cookie can only be read at this location
        path: '/',

        // This is the domain that the cookie 'name' belongs to. The cookie can only be read on this domain.
        //  - Guide to cookie domains - http://erik.io/blog/2014/03/04/definitive-guide-to-cookie-domains/
        domain: '',

        // The cookies expire date, specified in days (specify -1 for no expiry)
        expiryDays: 365,
      },

      // these callback hooks are called at certain points in the program execution
      onPopupOpen: function() {},
      onPopupClose: function() {},
      onInitialise: function() {},
      onStatusChange: function() {},
      onRevokeChoice: function() {},

      // each item defines the inner text for the element that it references
      content: {
        header: 'Privacy &amp; Cookie notice!',
        message: 'This website requires cookies, and the limited processing of your personal data in order to function. For more information please read our',
        allow: 'OK',
        deny: 'Decline',
        link: 'Privacy policy',
        href: 'http://cookiesandyou.com',
        close: '&#x274c;',
        tcsLinkLabel: 'Terms of use',
        tcsURL: 'http://terms.com'
      },
      GDPR_VERSION: '25-May-2018',
      // This is the HTML for the elements above. The string {{header}} will be replaced with the equivalent text below.
      // You can remove "{{header}}" and write the content directly inside the HTML if you want.
      //
      //  - ARIA rules suggest to ensure controls are tabbable (so the browser can find the first control),
      //    and to set the focus to the first interactive control (http://w3c.github.io/aria-in-html/)
      elements: {
        header: '<span class="gc-header">{{header}}</span>&nbsp;',
        message: '<span id="gdprconsent:desc" class="gc-message">{{message}}</span>',
        messagelink: '<span id="gdprconsent:desc" class="gc-message">{{message}} <a aria-label="learn more about our privacy policy" role=button tabindex="0" class="gc-link" href="{{href}}" rel="noopener noreferrer nofollow" target="_blank">{{link}}</a></span>',
        allow: '<a aria-label="allow cookies" role=button tabindex="0"  class="gc-btn gc-allow">{{allow}}</a>',
        deny: '<a aria-label="deny cookies" role=button tabindex="0" class="gc-btn gc-deny">{{deny}}</a>',
        link: '<a aria-label="learn more about cookies" role=button tabindex="0" class="gc-link" href="{{href}}" target="_blank">{{link}}</a>',
        close: '<span aria-label="deny cookie message" role=button tabindex="0" class="gc-close">{{close}}</span>',
        tscLink: ' &amp; <a aria-label="learn more about our terms of use" role=button tabindex="0" class="gc-link" href="{{tcsURL}}" target="_blank">{{tcsLinkLabel}}</a>'
        //compliance: compliance is also an element, but it is generated by the application, depending on `type` below
      },

      // The placeholders {{classes}} and {{children}} both get replaced during initialisation:
      //  - {{classes}} is where additional classes get added
      //  - {{children}} is where the HTML children are placed
      window: '<div role="dialog" aria-live="polite" aria-label="gdprconsent" aria-describedby="gdprconsent:desc" class="gc-window"><div class="gc-notice {{classes}}"><!--googleoff: all-->{{children}}<!--googleon: all--></div></div>',
      deathShroud: '<div role="dialog" aria-live="polite" aria-label="gdprconsent denied" aria-describedby="gdprconsent:desc" class="gc-death-shroud"><div class="gc-notice {{classes}}"><!--googleoff: all--><p>You have chosen to decline the privacy policy and therefore we cannot provide this service to you.</p><p>If you have changed your mind, either refresh the page or click on the "Privacy Policy" tab.</p><!--googleon: all--></div></div>',
      // This is the html for the revoke button. This only shows up after the user has selected their level of consent
      // It can be enabled of disabled using the `revokable` option
      revokeBtn: '<div class="gc-revoke {{classes}}">Privacy Policy</div>',

      // define types of 'compliance' here. '{{value}}' strings in here are linked to `elements`
      compliance: {
        'info': '<div class="gc-compliance">{{allow}}</div>',
        'opt-in': '<div class="gc-compliance gc-highlight">{{deny}}{{allow}}</div>'
      },

      // select your type of popup here
      type: 'info', // refers to `compliance` (in other words, the buttons that are displayed)

      // define layout layouts here
      layouts: {
        // the 'block' layout tend to be for square floating popups
        'basic': '{{messagelink}}{{tscLink}}{{compliance}}',
        'basic-close': '{{messagelink}}{{compliance}}{{close}}',
        'basic-header': '{{header}}{{message}}{{link}}{{compliance}}',

        // add a custom layout here, then add some new css with the class '.gc-layout-my-cool-layout'
        //'my-cool-layout': '<div class="my-special-layout">{{message}}{{compliance}}</div>{{close}}',
      },

      // default layout (see above)
      layout: 'basic',

      // this refers to the popup windows position. we currently support:
      //  - banner positions: top, bottom
      //  - floating positions: top-left, top-right, bottom-left, bottom-right
      //
      // adds a class `gc-floating` or `gc-banner` which helps when styling
      position: 'bottom', // default position is 'bottom'

      // Available styles
      //    -block (default, no extra classes)
      //    -edgeless
      //    -classic
      // use your own style name and use `.gc-theme-STYLENAME` class in CSS to edit.
      // Note: style "wire" is used for the configurator, but has no CSS styles of its own, only palette is used.
      theme: 'block',

      

      // if you want custom colours, pass them in here. this object should look like this.
      // ideally, any custom colours/themes should be created in a separate style sheet, as this is more efficient.
      //   {
      //     popup: {background: '#000000', text: '#fff', link: '#fff'},
      //     button: {background: 'transparent', border: '#f8e71c', text: '#f8e71c'},
      //     highlight: {background: '#f8e71c', border: '#f8e71c', text: '#000000'},
      //   }
      // `highlight` is optional and extends `button`. if it exists, it will apply to the first button
      // only background needs to be defined for every element. if not set, other colors can be calculated from it
      palette: null,

      // Some countries REQUIRE that a user can change their mind. You can configure this yourself.
      // Most of the time this should be false, but the `gdprconsent.law` can change this to `true` if it detects that it should
      revokable: false,

      // if true, the revokable button will translate in and out
      animateRevokable: true,

      // used to disable link on existing layouts
      // replaces element messagelink with message and removes content of link
      showLink: true,

      // The application automatically decide whether the popup should open.
      // Set this to false to prevent this from happening and to allow you to control the behaviour yourself
      autoOpen: true,

      // By default the created HTML is automatically appended to the container (which defaults to <body>). You can prevent this behaviour
      // by setting this to false, but if you do, you must attach the `element` yourself, which is a public property of the popup instance:
      // 
      //     var instance = gdprconsent.factory(options);
      //     document.body.appendChild(instance.element);
      //
      autoAttach: true,

      // simple whitelist/blacklist for pages. specify page by:
      //   - using a string : '/index.html'           (matches '/index.html' exactly) OR
      //   - using RegExp   : /\/page_[\d]+\.html/    (matched '/page_1.html' and '/page_2.html' etc)
      whitelistPage: [],
      blacklistPage: [],

      // If this is defined, then it is used as the inner html instead of layout. This allows for ultimate customisation.
      // Be sure to use the classes `gc-btn` and `gc-allow` or `gc-deny`. They enable the app to register click
      // handlers. You can use other pre-existing classes too. See `src/styles` folder.
      overrideHTML: null,
    };

    function GDPRPopup() {
      this.initialise.apply(this, arguments);
    }

    GDPRPopup.prototype.initialise = function(options) {
      if (this.options) {
        this.destroy(); // already rendered
      }

      // set options back to default options
      util.deepExtend(this.options = {}, defaultOptions);

      // merge in user options
      if (util.isPlainObject(options)) {
        util.deepExtend(this.options, options);
      }

      // returns true if `onComplete` was called
      if (checkCallbackHooks.call(this)) {
        // user has already answered
        if (this.checkVersion()) {
          this.options.enabled = false;
        }
        
      }

      // apply blacklist / whitelist
      if (arrayContainsMatches(this.options.blacklistPage, location.pathname)) {
        this.options.enabled = false;
      }
      if (arrayContainsMatches(this.options.whitelistPage, location.pathname)) {
        this.options.enabled = true;
      }
      
      // the full markup either contains the wrapper or it does not (for multiple instances)
      var gdprPopup = this.options.window
        .replace('{{classes}}', getPopupClasses.call(this).join(' '))
        .replace('{{children}}', getPopupInnerMarkup.call(this));

      // if user passes html, use it instead
      var customHTML = this.options.overrideHTML;
      if (typeof customHTML == 'string' && customHTML.length) {
        gdprPopup = customHTML;
      }

      this.element = appendMarkup.call(this, gdprPopup);

      applyRevokeButton.call(this);

      if (this.options.autoOpen) {
        this.autoOpen();
      }
    };

    GDPRPopup.prototype.destroy = function() {
      if (this.onButtonClick && this.element) {
        this.element.removeEventListener('click', this.onButtonClick);
        this.onButtonClick = null;
      }

      if (this.onWindowScroll) {
        window.removeEventListener('scroll', this.onWindowScroll);
        this.onWindowScroll = null;
      }

      if (this.onMouseMove) {
        window.removeEventListener('mousemove', this.onMouseMove);
        this.onMouseMove = null;
      }

      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.element = null;

      if (this.revokeBtn && this.revokeBtn.parentNode) {
        this.revokeBtn.parentNode.removeChild(this.revokeBtn);
      }
      this.revokeBtn = null;

      removeCustomStyle(this.options.palette);
      this.options = null;
    };

    GDPRPopup.prototype.openDeathShroud = function () {
      var shroud = document.getElementsByClassName("gc-death-shroud")[0];
      shroud.style.display = '';
      var revoke = document.getElementsByClassName("gc-revoke")[0];
      
      if (revoke) {
        revoke.classList.remove("gc-animate");
      }
    }

    GDPRPopup.prototype.closeDeathShroud = function () {
      var shroud = document.getElementsByClassName("gc-death-shroud")[0];
      shroud.style.display = 'none';
    }

    GDPRPopup.prototype.open = function() {
      if (!this.element) return;
      if (!this.isOpen()) {
        if (gc.hasTransition) {
          this.fadeIn();
        } else {
          this.element.style.display = '';
        }

        if (this.options.revokable) {
          this.toggleRevokeButton();
        }
        if (this.options.type === 'opt-in'){
          var myAllow = document.getElementsByClassName("gc-allow")[0].classList;
          var myDeny  = document.getElementsByClassName("gc-deny")[0].classList;
          if (!this.hasConsented()){
            myDeny.remove('gc-notselected');
            myDeny.add('gc-selected');
            myAllow.remove('gc-selected');
            myAllow.add('gc-notselected');
          } else {
            myAllow.remove('gc-notselected');
            myAllow.add('gc-selected');
            myDeny.remove('gc-selected');
            myDeny.add('gc-notselected');
          }
        }
        this.options.onPopupOpen.call(this);
      }

      return this;
    };

    GDPRPopup.prototype.close = function(showRevoke) {
      if (!this.element) return;

      if (this.isOpen()) {
        if (gc.hasTransition) {
          this.fadeOut();
        } else {
          this.element.style.display = 'none';
        }

        if (showRevoke && this.options.revokable) {
          this.toggleRevokeButton(true);
        }
        this.options.onPopupClose.call(this);
      }

      return this;
    };

    GDPRPopup.prototype.fadeIn = function() {
      var el = this.element;

      if (!gc.hasTransition || !el)
        return;

      // This should always be called AFTER fadeOut (which is governed by the 'transitionend' event).
      // 'transitionend' isn't all that reliable, so, if we try and fadeIn before 'transitionend' has
      // has a chance to run, then we run it ourselves
      if (this.afterTransition) {
        afterFadeOut.call(this, el)
      }

      if (util.hasClass(el, 'gc-invisible')) {
        el.style.display = '';

        if (this.options.static) {
          var height = this.element.clientHeight;
          this.element.parentNode.style.maxHeight = height + 'px';
        }

        var fadeInTimeout = 20; // (ms) DO NOT MAKE THIS VALUE SMALLER. See below

        // Although most browsers can handle values less than 20ms, it should remain above this value.
        // This is because we are waiting for a "browser redraw" before we remove the 'gc-invisible' class.
        // If the class is removed before a redraw could happen, then the fadeIn effect WILL NOT work, and
        // the popup will appear from nothing. Therefore we MUST allow enough time for the browser to do
        // its thing. The actually difference between using 0 and 20 in a set timeout is negligible anyway
        this.openingTimeout = setTimeout(afterFadeIn.bind(this, el), fadeInTimeout);
      }
    };

    GDPRPopup.prototype.fadeOut = function() {
      var el = this.element;

      if (!gc.hasTransition || !el)
        return;

      if (this.openingTimeout) {
        clearTimeout(this.openingTimeout);
        afterFadeIn.bind(this, el);
      }

      if (!util.hasClass(el, 'gc-invisible')) {
        if (this.options.static) {
          this.element.parentNode.style.maxHeight = '';
        }

        this.afterTransition = afterFadeOut.bind(this, el);
        el.addEventListener(gc.transitionEnd, this.afterTransition);

        util.addClass(el, 'gc-invisible');
      }
    };

    GDPRPopup.prototype.isOpen = function() {
      return this.element && this.element.style.display == '' && (gc.hasTransition ? !util.hasClass(this.element, 'gc-invisible') : true);
    };

    GDPRPopup.prototype.toggleRevokeButton = function(show) {
      if (this.revokeBtn) this.revokeBtn.style.display = show ? '' : 'none';
    };

    GDPRPopup.prototype.revokeChoice = function(preventOpen) {
      this.options.enabled = true;
      this.closeDeathShroud();
      if(this.options.type === 'opt-in'){
          //We don't want this next line as we want the button to pop up and allow us to change the settings.
          //this.clearStatus();

          this.options.onRevokeChoice.call(this);

           if (!preventOpen) {
              this.autoOpen();
          }
          this.open();
      } else {
          this.clearStatus();
          this.options.onRevokeChoice.call(this);
          if (!preventOpen) {
              this.autoOpen();
          }
      }
    };

    // returns true if the cookie has a valid value
    GDPRPopup.prototype.hasAnswered = function() {
      return Object.keys(gc.status).indexOf(this.getStatus()) >= 0;
    };

    // returns true if the cookie indicates that consent has been given
    GDPRPopup.prototype.hasConsented = function() {
      var val = this.getStatus();
      return val == gc.status.allow || val == gc.status.deny;
    };

    // opens the popup if no answer has been given
    GDPRPopup.prototype.autoOpen = function() {
      !this.hasAnswered() && this.options.enabled && this.open();
    };

    GDPRPopup.prototype.setStatus = function(status) {
      var c = this.options.cookie;
      var value = util.getCookie(c.name);
      var chosenBefore = Object.keys(gc.status).indexOf(value) >= 0;
      // if `status` is valid
      if (Object.keys(gc.status).indexOf(status) >= 0) {
        util.setCookie(c.name, status, c.expiryDays, c.domain, c.path);
        util.setCookie('gdpr_version', this.options.GDPR_VERSION, c.expiryDays, c.domain, c.path);
        if (status === 'deny'){
          this.clearStatus();
          this.openDeathShroud();
        } else {
          if(this.options.animateRevokable){
            var revoke = document.getElementsByClassName("gc-revoke")[0];
            if (revoke) {
              revoke.classList.add('gc-animate');
            }
          }
          this.options.onStatusChange.call(this, status, chosenBefore);
        }
      } else {
        this.clearStatus();
      }
    };

    GDPRPopup.prototype.getStatus = function() {
      return util.getCookie(this.options.cookie.name);
    };

    GDPRPopup.prototype.clearStatus = function() {
      var c = this.options.cookie;
      util.setCookie(c.name, '', -1, c.domain, c.path);
      util.setCookie('gdpr_version', '', -1, c.domain, c.path);
    };

    GDPRPopup.prototype.checkVersion = function () {
      if (util.getCookie('gdpr_version') !== this.options.GDPR_VERSION){
      this.clearStatus();
        this.open();
        return false;
      }
      return true;
    }

    // This needs to be called after 'fadeIn'. This is the code that actually causes the fadeIn to work
    // There is a good reason why it's called in a timeout. Read 'fadeIn';
    function afterFadeIn(el) {
      this.openingTimeout = null;
      util.removeClass(el, 'gc-invisible');
    }

    // This is called on 'transitionend' (only on the transition of the fadeOut). That's because after we've faded out, we need to
    // set the display to 'none' (so there aren't annoying invisible popups all over the page). If for whenever reason this function
    // is not called (lack of support), the open/close mechanism will still work.
    function afterFadeOut(el) {
      el.style.display = 'none'; // after close and before open, the display should be none
      el.removeEventListener(gc.transitionEnd, this.afterTransition);
      this.afterTransition = null;
    }

    // this function calls the `onComplete` hook and returns true (if needed) and returns false otherwise
    function checkCallbackHooks() {
      var complete = this.options.onInitialise.bind(this);

      if (!window.navigator.cookieEnabled) {
        complete(gc.status.deny);
        return true;
      }

      if (window.CookiesOK || window.navigator.CookiesOK) {
        complete(gc.status.allow);
        return true;
      }
      
      var allowed = Object.keys(gc.status);
      var answer = this.getStatus();
      var match = allowed.indexOf(answer) >= 0;
      if (match) {
        complete(answer);
      }
      return match;
    }

    function getPositionClasses() {
      var positions = this.options.position.split('-'); // top, bottom, left, right
      var classes = [];

      // top, left, right, bottom
      positions.forEach(function(cur) {
        classes.push('gc-' + cur);
      });

      return classes;
    }

    function getPopupClasses() {
      var opts = this.options;
      var positionStyle = 'floating';
      var classes = [
        'gc-' + positionStyle, // floating or banner
        'gc-type-' + opts.type, // add the compliance type
        'gc-theme-' + opts.theme, // add the theme
      ];
      // we only add extra styles if `palette` has been set to a valid value
      attachCustomPalette.call(this, this.options.palette);

      // if we override the palette, add the class that enables this
      if (this.customStyleSelector) {
        classes.push(this.customStyleSelector);
      }

      return classes;
    }

    function getPopupInnerMarkup() {
      var interpolated = {};
      var opts = this.options;

      // removes link if showLink is false
      if (!opts.showLink) {
        opts.elements.link = '';
        opts.elements.messagelink = opts.elements.message;
      }

      if (!opts.tcs){
        opts.elements.tscLink = '';
      }

      Object.keys(opts.elements).forEach(function(prop) {
        interpolated[prop] = util.interpolateString(opts.elements[prop], function(name) {
          var str = opts.content[name];
          return (name && typeof str == 'string' && str.length) ? str : '';
        })
      });
      
      // checks if the type is valid and defaults to info if it's not
      var complianceType = opts.compliance[opts.type];
      if (!complianceType) {
        complianceType = opts.compliance.info;
      }

      // build the compliance types from the already interpolated `elements`
      interpolated.compliance = util.interpolateString(complianceType, function(name) {
        return interpolated[name];
      });

      // checks if the layout is valid and defaults to basic if it's not
      var layout = opts.layouts[opts.layout];
      if (!layout) {
        layout = opts.layouts.basic;
      }
      console.log(interpolated);
      return util.interpolateString(layout, function(match) {
        return interpolated[match];
      });
    }

    function appendMarkup(markup) {
      var opts = this.options;
      var div = document.createElement('div');
      var cont = (opts.container && opts.container.nodeType === 1) ? opts.container : document.body;
      div.innerHTML = markup;

      var el = div.children[0];

      el.style.display = 'none';

      if (util.hasClass(el, 'gc-window') && gc.hasTransition) {
        util.addClass(el, 'gc-invisible');
      }

      // save ref to the function handle so we can unbind it later
      this.onButtonClick = handleButtonClick.bind(this);

      el.addEventListener('click', this.onButtonClick);

      if (opts.autoAttach) {
        if (!cont.firstChild) {
          cont.appendChild(el);
        } else {
          cont.insertBefore(el, cont.firstChild)
        }
      }

      return el;
    }

    function handleButtonClick(event) {
      var targ = event.target;
      if (util.hasClass(targ, 'gc-btn')) {

        var matches = targ.className.match(new RegExp("\\bgc-(" + __allowedStatuses.join('|') + ")\\b"));
        var match = (matches && matches[1]) || false;

        if (match) {
          this.setStatus(match);
          this.close(true);
        }
      }
      if (util.hasClass(targ, 'gc-close')) {
        this.setStatus(gc.status.deny);
        this.close(true);
      }
      if (util.hasClass(targ, 'gc-revoke')) {
        this.revokeChoice();
      }
    }

    // I might change this function to use inline styles. I originally chose a stylesheet because I could select many elements with a
    // single rule (something that happened a lot), the apps has changed slightly now though, so inline styles might be more applicable.
    function attachCustomPalette(palette) {
      var hash = util.hash(JSON.stringify(palette));
      var selector = 'gc-color-override-' + hash;
      var isValid = util.isPlainObject(palette);

      this.customStyleSelector = isValid ? selector : null;

      if (isValid) {
        addCustomStyle(hash, palette, '.' + selector);
      }
      return isValid;
    }

    function addCustomStyle(hash, palette, prefix) {

      // only add this if a style like it doesn't exist
      if (gc.customStyles[hash]) {
        // custom style already exists, so increment the reference count
        ++gc.customStyles[hash].references;
        return;
      }

      var colorStyles = {};
      var popup = palette.popup;
      var button = palette.button;
      var highlight = palette.highlight;

      // needs background colour, text and link will be set to black/white if not specified
      if (popup) {
        // assumes popup.background is set
        popup.text = popup.text ? popup.text : util.getContrast(popup.background);
        popup.link = popup.link ? popup.link : popup.text;
        colorStyles[prefix + '.gc-notice'] = [
          'color: ' + popup.text,
          'background-color: ' + popup.background
        ];
        colorStyles[prefix + '.gc-revoke'] = [
          'color: ' + popup.text,
          'background-color: ' + popup.background
        ];
        colorStyles[prefix + ' .gc-link,' + prefix + ' .gc-link:active,' + prefix + ' .gc-link:visited'] = [
          'color: ' + popup.link
        ];

        if (button) {
          // assumes button.background is set
          button.text = button.text ? button.text : util.getContrast(button.background);
          button.border = button.border ? button.border : 'transparent';
          colorStyles[prefix + ' .gc-btn'] = [
            'color: ' + button.text,
            'border-color: ' + button.border,
            'background-color: ' + button.background
          ];
          
          if(button.background != 'transparent') 
            colorStyles[prefix + ' .gc-btn:hover, ' + prefix + ' .gc-btn:focus'] = [
              'background-color: ' + getHoverColour(button.background)
            ];

          if (highlight) {
            //assumes highlight.background is set
            highlight.text = highlight.text ? highlight.text : util.getContrast(highlight.background);
            highlight.border = highlight.border ? highlight.border : 'transparent';
            colorStyles[prefix + ' .gc-highlight .gc-btn:first-child'] = [
              'color: ' + highlight.text,
              'border-color: ' + highlight.border,
              'background-color: ' + highlight.background
            ];
          } else {
            // sets highlight text color to popup text. background and border are transparent by default.
            colorStyles[prefix + ' .gc-highlight .gc-btn:first-child'] = [
              'color: ' + popup.text
            ];
          }
        }

      }

      // this will be interpreted as CSS. the key is the selector, and each array element is a rule
      var style = document.createElement('style');
      document.head.appendChild(style);

      // custom style doesn't exist, so we create it
      gc.customStyles[hash] = {
        references: 1,
        element: style.sheet
      };

      var ruleIndex = -1;
      for (var prop in colorStyles) {
        if (colorStyles.hasOwnProperty(prop)) {
          style.sheet.insertRule(prop + '{' + colorStyles[prop].join(';') + '}', ++ruleIndex);
        }
      }
    }

    function getHoverColour(hex) {
      hex = util.normaliseHex(hex);
      // for black buttons
      if (hex == '000000') {
        return '#222';
      }
      return util.getLuminance(hex);
    }

    function removeCustomStyle(palette) {
      if (util.isPlainObject(palette)) {
        var hash = util.hash(JSON.stringify(palette));
        var customStyle = gc.customStyles[hash];
        if (customStyle && !--customStyle.references) {
          var styleNode = customStyle.element.ownerNode;
          if (styleNode && styleNode.parentNode) {
            styleNode.parentNode.removeChild(styleNode);
          }
          gc.customStyles[hash] = null;
        }
      }
    }

    function arrayContainsMatches(array, search) {
      for (var i = 0, l = array.length; i < l; ++i) {
        var str = array[i];
        // if regex matches or string is equal, return true
        if ((str instanceof RegExp && str.test(search)) ||
          (typeof str == 'string' && str.length && str === search)) {
          return true;
        }
      }
      return false;
    }

    function applyRevokeButton() {
      // revokable is true if advanced compliance is selected
      if (this.options.type != 'info') this.options.revokable = true;
      // animateRevokable false for mobile devices
      if (util.isMobile()) this.options.animateRevokable = false;

      if (this.options.revokable) {
        var classes = getPositionClasses.call(this);
        if (this.options.animateRevokable) {
          classes.push('gc-animate');
        }
        if (this.customStyleSelector) {
          classes.push(this.customStyleSelector)
        }
        var revokeBtn = this.options.revokeBtn.replace('{{classes}}', classes.join(' '));
        this.revokeBtn = appendMarkup.call(this, revokeBtn);

        var btn = this.revokeBtn;
        if (this.options.animateRevokable) {
          var onMouseMove = util.throttle(function(evt) {
            var active = false;
            var minY = 20;
            var maxY = (window.innerHeight - 20);

            if (util.hasClass(btn, 'gc-top') && evt.clientY < minY) active = true;
            if (util.hasClass(btn, 'gc-bottom') && evt.clientY > maxY) active = true;

            if (active) {
              if (!util.hasClass(btn, 'gc-active')) {
                util.addClass(btn, 'gc-active');
              }
            } else {
              if (util.hasClass(btn, 'gc-active')) {
                util.removeClass(btn, 'gc-active');
              }
            }
          }, 200);

          this.onMouseMove = onMouseMove;
          window.addEventListener('mousemove', onMouseMove);
        }
        var deathShroud = this.options.deathShroud
          .replace('{{classes}}', getPopupClasses.call(this).join(' '));
        this.deathShroud = appendMarkup.call(this, deathShroud);
      }
    }

    return GDPRPopup
  }());

  gc.Location = (function() {

    // An object containing all the location services we have already set up.
    // When using a service, it could either return a data structure in plain text (like a JSON object) or an executable script
    // When the response needs to be executed by the browser, then `isScript` must be set to true, otherwise it won't work.

    // When the service uses a script, the chances are that you'll have to use the script to make additional requests. In these
    // cases, the services `callback` property is called with a `done` function. When performing async operations, this must be called
    // with the data (or Error), and `gdprconsent.locate` will take care of the rest
    var defaultOptions = {

      // The default timeout is 5 seconds. This is mainly needed to catch JSONP requests that error.
      // Otherwise there is no easy way to catch JSONP errors. That means that if a JSONP fails, the
      // app will take `timeout` milliseconds to react to a JSONP network error.
      timeout: 5000,

      // the order that services will be attempted in
      services: [
        'maxmind',
        'ipstack'

        /*

        // 'ipinfodb' requires some options, so we define it using an object
        // this object will be passed to the function that defines the service

        {
          name: 'ipinfodb',
          interpolateUrl: {
            // obviously, this is a fake key
            api_key: 'vOgI3748dnIytIrsJcxS7qsDf6kbJkE9lN4yEDrXAqXcKUNvjjZPox3ekXqmMMld'
          },
        },

        // as well as defining an object, you can define a function that returns an object

        function () {
          return {name: 'ipinfodb'};
        },

        */
      ],

      serviceDefinitions: {
        maxmind: function() {
          return {
            // This service responds with a JavaScript file which defines additional functionality. Once loaded, we must
            // make an additional AJAX call. Therefore we provide a `done` callback that can be called asynchronously
            url: '//js.maxmind.com/js/apis/geoip2/v2.1/geoip2.js',
            isScript: true, // this service responds with a JavaScript file, so it must be run as a script
            callback: function(done) {
              // if everything went okay then `geoip2` WILL be defined
              if (!window.geoip2) {
                done(new Error('Unexpected response format. The downloaded script should have exported `geoip2` to the global scope'));
                return;
              }

              window.geoip2.country(function(location) {
                try {
                  done({
                    code: location.country.iso_code
                  });
                } catch (err) {
                  done(toError(err));
                }
              }, function(err) {
                done(toError(err));
              });

              // We can't return anything, because we need to wait for the second AJAX call to return.
              // Then we can 'complete' the service by passing data or an error to the `done` callback.
            }
          }
        },
        ipstack: function() {
          return {
            url: 'http://api.ipstack.com/check?access_key={api_key}&output=json&fields=country_code',
            callback: function(done, response) {
              try{
                var json = JSON.parse(response);
                return json.error ? toError(json) : {
                  code: json.country_code
                };
              } catch (err) {
                return toError({error: 'Invalid response ('+err+')'});
              }
            }
          }
        }
      },
    };

    function Location(options) {
      // Set up options
      util.deepExtend(this.options = {}, defaultOptions);

      if (util.isPlainObject(options)) {
        util.deepExtend(this.options, options);
      }

      this.currentServiceIndex = -1; // the index (in options) of the service we're currently using
    }

    Location.prototype.getNextService = function() {
      var service;
      
      do {
        service = this.getServiceByIdx(++this.currentServiceIndex);
      } while (this.currentServiceIndex < this.options.services.length && !service);
      return service;
    };

    Location.prototype.getServiceByIdx = function(idx) {
      // This can either be the name of a default locationService, or a function.
      var serviceOption = this.options.services[idx];

      // If it's a string, use one of the location services.
      if (typeof serviceOption === 'function') {
        var dynamicOpts = serviceOption();
        if (dynamicOpts.name) {
          util.deepExtend(dynamicOpts, this.options.serviceDefinitions[dynamicOpts.name](dynamicOpts));
        }
        return dynamicOpts;
      }

      // If it's a string, use one of the location services.
      if (typeof serviceOption === 'string') {
        return this.options.serviceDefinitions[serviceOption]();
      }

      // If it's an object, assume {name: 'ipinfo', ...otherOptions}
      // Allows user to pass in API keys etc.
      if (util.isPlainObject(serviceOption)) {
        return this.options.serviceDefinitions[serviceOption.name](serviceOption);
      }

      return null;
    };

    // This runs the service located at index `currentServiceIndex`.
    // If the service fails, `runNextServiceOnError` will continue trying each service until all fail, or one completes successfully
    Location.prototype.locate = function(complete, error) {
      var service = this.getNextService();

      if (!service) {
        error(new Error('No services to run'));
        return;
      }

      this.callbackComplete = complete;
      this.callbackError = error;
      this.runService(service, this.runNextServiceOnError.bind(this));
    };

    // Potentially adds a callback to a url for jsonp.
    Location.prototype.setupUrl = function(service) {
      var serviceOpts = this.getCurrentServiceOpts();
      return service.url.replace(/\{(.*?)\}/g, function(_, param) {
        if (param === 'callback') {
          var tempName = 'callback' + Date.now();
          window[tempName] = function(res) {
            service.__JSONP_DATA = JSON.stringify(res);
          }
          return tempName;
        }
        if (param in serviceOpts.interpolateUrl) {
          return serviceOpts.interpolateUrl[param];
        }
      });
    };

    // requires a `service` object that defines at least a `url` and `callback`
    Location.prototype.runService = function(service, complete) {
      var self = this;

      // basic check to ensure it resembles a `service`
      if (!service || !service.url || !service.callback) {
        return;
      }

      // we call either `getScript` or `makeAsyncRequest` depending on the type of resource
      var requestFunction = service.isScript ? getScript : makeAsyncRequest;

      var url = this.setupUrl(service);

      // both functions have similar signatures so we can pass the same arguments to both
      requestFunction(url, function(xhr) {
        // if `!xhr`, then `getScript` function was used, so there is no response text
        var responseText = xhr ? xhr.responseText : '';

        // if the resource is a script, then this function is called after the script has been run.
        // if the script is JSONP, then a time defined function `callback_{Date.now}` has already
        // been called (as the JSONP callback). This callback sets the __JSONP_DATA property
        if (service.__JSONP_DATA) {
          responseText = service.__JSONP_DATA;
          delete service.__JSONP_DATA;
        }

        // call the service callback with the response text (so it can parse the response)
        self.runServiceCallback.call(self, complete, service, responseText);

      }, this.options.timeout, service.data, service.headers);
      
      // `service.data` and `service.headers` are optional (they only count if `!service.isScript` anyway)
    };

    // The service request has run (and possibly has a `responseText`) [no `responseText` if `isScript`]
    // We need to run its callback which determines if its successful or not
    // `complete` is called on success or failure
    Location.prototype.runServiceCallback = function(complete, service, responseText) {
      var self = this;
      // this is the function that is called if the service uses the async callback in its handler method
      var serviceResultHandler = function (asyncResult) {
        // if `result` is a valid value, then this function shouldn't really run
        // even if it is called by `service.callback`
        if (!result) {
          self.onServiceResult.call(self, complete, asyncResult)
        }
      };

      // the function `service.callback` will either extract a country code from `responseText` and return it (in `result`)
      // or (if it has to make additional requests) it will call a `done` callback with the country code when it is ready
      var result = service.callback(serviceResultHandler, responseText);

      if (result) {
        this.onServiceResult.call(this, complete, result);
      }
    };

    // This is called with the `result` from `service.callback` regardless of how it provided that result (sync or async).
    // `result` will be whatever is returned from `service.callback`. A service callback should provide an object with data
    Location.prototype.onServiceResult = function(complete, result) {
      // convert result to nodejs style async callback
      if (result instanceof Error || (result && result.error)) {
        complete.call(this, result, null);
      } else {
        complete.call(this, null, result);
      }
    };

    // if `err` is set, the next service handler is called
    // if `err` is null, the `onComplete` handler is called with `data`
    Location.prototype.runNextServiceOnError = function(err, data) {
      if (err) {
        this.logError(err);

        var nextService = this.getNextService();

        if (nextService) {
          this.runService(nextService, this.runNextServiceOnError.bind(this));
        } else {
          this.completeService.call(this, this.callbackError, new Error('All services failed'));
        }
      } else {
        this.completeService.call(this, this.callbackComplete, data);
      }
    };

    Location.prototype.getCurrentServiceOpts = function() {
      var val = this.options.services[this.currentServiceIndex];

      if (typeof val == 'string') {
        return {name: val};
      }

      if (typeof val == 'function') {
        return val();
      }

      if (util.isPlainObject(val)) {
        return val;
      }

      return {};
    };

    // calls the `onComplete` callback after resetting the `currentServiceIndex`
    Location.prototype.completeService = function(fn, data) {
      this.currentServiceIndex = -1;
      fn && fn(data);
    };

    Location.prototype.logError = function (err) {
      var idx = this.currentServiceIndex;
      var service = this.getServiceByIdx(idx);

      console.error('The service[' + idx + '] (' + service.url + ') responded with the following error', err);
    };

    function getScript(url, callback, timeout) {
      var timeoutIdx, s = document.createElement('script');

      s.type = 'text/' + (url.type || 'javascript');
      s.src = url.src || url;
      s.async = false;

      s.onreadystatechange = s.onload = function() {
        // this code handles two scenarios, whether called by onload or onreadystatechange
        var state = s.readyState;

        clearTimeout(timeoutIdx);

        if (!callback.done && (!state || /loaded|complete/.test(state))) {
          callback.done = true;
          callback();
          s.onreadystatechange = s.onload = null;
        }
      };

      document.body.appendChild(s);

      // You can't catch JSONP Errors, because it's handled by the script tag
      // one way is to use a timeout
      timeoutIdx = setTimeout(function () {
        callback.done = true;
        callback();
        s.onreadystatechange = s.onload = null;
      }, timeout);
    }

    function makeAsyncRequest(url, onComplete, timeout, postData, requestHeaders) {
      var xhr = new(window.XMLHttpRequest || window.ActiveXObject)('MSXML2.XMLHTTP.3.0');

      xhr.open(postData ? 'POST' : 'GET', url, 1);

      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

      if (Array.isArray(requestHeaders)) {
        for (var i = 0, l = requestHeaders.length; i < l; ++i) {
          var split = requestHeaders[i].split(':', 2)
          xhr.setRequestHeader(split[0].replace(/^\s+|\s+$/g, ''), split[1].replace(/^\s+|\s+$/g, ''));
        }
      }

      if (typeof onComplete == 'function') {
        xhr.onreadystatechange = function() {
          if (xhr.readyState > 3) {
            onComplete(xhr);
          }
        };
      }

      xhr.send(postData);
    }

    function toError(obj) {
      return new Error('Error [' + (obj.code || 'UNKNOWN') + ']: ' + obj.error);
    }

    return Location;
  }());

  gc.Law = (function() {

    var defaultOptions = {
      // Make this false if you want to disable all regional overrides for settings.
      // If true, options can differ by country, depending on their cookie law.
      // It does not affect hiding the popup for countries that do not have cookie law.
      regionalLaw: true,

      // countries that enforce some version of a cookie law
      hasLaw: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'RO', 'SK', 'SI', 'ES', 'SE', 'UK', 'GB'],

      // countries that say that all cookie consent choices must be revokable (a user should be able to change their mind)
      revokable: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'RO', 'SK', 'SI', 'ES', 'SE', 'UK', 'GB'],

      // countries that say that a person can only "consent" if the explicitly click on "I agree".
      // in these countries, consent cannot be implied via a timeout or by scrolling down the page
      explicitAction: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'RO', 'SK', 'SI', 'ES', 'SE', 'UK', 'GB'],
    };

    function Law() {
      this.initialise.apply(this, arguments);
    }

    Law.prototype.initialise = function(options) {
      // set options back to default options
      util.deepExtend(this.options = {}, defaultOptions);

      // merge in user options
      if (util.isPlainObject(options)) {
        util.deepExtend(this.options, options);
      }
    };

    Law.prototype.get = function(countryCode) {
      var opts = this.options;
      return {
        hasLaw: opts.hasLaw.indexOf(countryCode) >= 0,
        revokable: opts.revokable.indexOf(countryCode) >= 0,
        explicitAction: opts.explicitAction.indexOf(countryCode) >= 0,
      };
    };

    Law.prototype.applyLaw = function(options, countryCode) {
      var country = this.get(countryCode);

      if (!country.hasLaw) {
        // The country has no cookie law
        options.enabled = false;
      }

      if (this.options.regionalLaw) {
        if (country.revokable) {
          // We must provide an option to revoke consent at a later time
          options.revokable = true;
        }
      }
      return options;
    };

    return Law;
  }());

  // This function initialises the app by combining the use of the Popup, Locator and Law modules
  // You can string together these three modules yourself however you want, by writing a new function.
  gc.initialise = function(options, complete, error) {
    var law = new gc.Law(options.law);
    
    if (!complete) complete = function() {};
    if (!error) error = function() {};

    gc.getCountryCode(options, function(result) {
      // don't need the law or location options anymore
      delete options.law;
      delete options.location;
      
      if (result.code) {
        options = law.applyLaw(options, result.code);
      }
      complete(new gc.Popup(options));
    }, function(err) {
      // don't need the law or location options anymore
      delete options.law;
      delete options.location;
      error(err, new gc.Popup(options));
    });
    
  };

  // This function tries to find your current location. It either grabs it from a hard coded option in
  // `options.law.countryCode`, or attempts to make a location service request. This function accepts
  // options (which can configure the `law` and `location` modules) and fires a callback with which
  // passes an object `{code: countryCode}` as the first argument (which can have undefined properties)
  gc.getCountryCode = function(options, complete, error) {
    if (options.law && options.law.countryCode) {
      complete({
        code: options.law.countryCode
      });
      return;
    }
    if (options.location) {
      var locator = new gc.Location(options.location);
      locator.locate(function(serviceResult) {
        complete(serviceResult || {});
      }, error);
      return;
    }
    complete({});
  };

  // export utils (no point in hiding them, so we may as well expose them)
  gc.utils = util;

  // prevent this code from being run twice
  gc.hasInitialised = true;

  window.gdprconsent = gc;

}(window.gdprconsent || {}));
