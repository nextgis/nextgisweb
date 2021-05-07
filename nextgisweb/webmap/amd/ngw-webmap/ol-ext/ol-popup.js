define([
    'openlayers/ol',
    'xstyle/css!./ol-popup.css'
], function (ol) {
    var classCallCheck = function (instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError('Cannot call a class as a function');
        }
    };
    
    var createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ('value' in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }
        
        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();
    
    
    var inherits = function (subClass, superClass) {
        if (typeof superClass !== 'function' && superClass !== null) {
            throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass);
        }
        
        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    };
    
    
    var possibleConstructorReturn = function (self, call) {
        if (!self) {
            throw new ReferenceError('this hasn\'t been initialised - super() hasn\'t been called');
        }
        
        return call && (typeof call === 'object' || typeof call === 'function') ? call : self;
    };
    
    /**
     * OpenLayers Popup Overlay.
     * See [the examples](./examples) for usage. Styling can be done via CSS.
     * @constructor
     * @extends {ol.Overlay}
     * @param {olx.OverlayOptions} opt_options options as defined by ol.Overlay. Defaults to
     * `{autoPan: true, autoPanAnimation: {duration: 250}}`
     */
    
    var Popup = function (_Overlay) {
        inherits(Popup, _Overlay);
        
        function Popup(opt_options) {
            classCallCheck(this, Popup);
            
            
            var options = opt_options || {};
            
            if (options.autoPan === undefined) {
                options.autoPan = true;
            }
            
            if (options.autoPanAnimation === undefined) {
                options.autoPanAnimation = {
                    duration: 250
                };
            }
            
            var element = document.createElement('div');
            
            options.element = element;
            
            var _this = possibleConstructorReturn(this, (Popup.__proto__ || Object.getPrototypeOf(Popup)).call(this, options));
            
            _this.container = element;
            _this.container.className = 'ol-popup';
            
            if (options.customCssClass) {
                _this.container.className = _this.container.className + ' ' + options.customCssClass;
            }
            
            _this.closer = document.createElement('a');
            _this.closer.className = 'ol-popup-closer';
            _this.closer.href = '#';
            _this.container.appendChild(_this.closer);
            
            var that = _this;
            _this.closer.addEventListener('click', function (evt) {
                that.container.style.display = 'none';
                that.closer.blur();
                evt.preventDefault();
            }, false);
            
            _this.content = document.createElement('div');
            _this.content.className = 'ol-popup-content';
            _this.container.appendChild(_this.content);
            
            // Apply workaround to enable scrolling of content div on touch devices
            Popup.enableTouchScroll_(_this.content);
            
            return _this;
        }
        
        /**
         * Show the popup.
         * @param {ol.Coordinate} coord Where to anchor the popup.
         * @param {String|HTMLElement} html String or element of HTML to display within the popup.
         * @returns {Popup} The Popup instance
         */
        
        
        createClass(Popup, [{
            key: 'show',
            value: function show(coord, html) {
                if (html instanceof HTMLElement) {
                    this.content.innerHTML = '';
                    this.content.appendChild(html);
                } else {
                    this.content.innerHTML = html;
                }
                this.container.style.display = 'block';
                this.content.scrollTop = 0;
                this.setPosition(coord);
                return this;
            }
            
            /**
             * @private
             * @desc Determine if the current browser supports touch events. Adapted from
             * https://gist.github.com/chrismbarr/4107472
             */
            
        }, {
            key: 'hide',
            
            
            /**
             * Hide the popup.
             * @returns {Popup} The Popup instance
             */
            value: function hide() {
                this.container.style.display = 'none';
                return this;
            }
            
            /**
             * Indicates if the popup is in open state
             * @returns {Boolean} Whether the popup instance is open
             */
            
        }, {
            key: 'isOpened',
            value: function isOpened() {
                return this.container.style.display == 'block';
            }
        }], [{
            key: 'isTouchDevice_',
            value: function isTouchDevice_() {
                try {
                    document.createEvent('TouchEvent');
                    return true;
                } catch (e) {
                    return false;
                }
            }
            
            /**
             * @private
             * @desc Apply workaround to enable scrolling of overflowing content within an
             * element. Adapted from https://gist.github.com/chrismbarr/4107472
             */
            
        }, {
            key: 'enableTouchScroll_',
            value: function enableTouchScroll_(elm) {
                if (Popup.isTouchDevice_()) {
                    var scrollStartPos = 0;
                    elm.addEventListener('touchstart', function (event) {
                        scrollStartPos = this.scrollTop + event.touches[0].pageY;
                    }, false);
                    elm.addEventListener('touchmove', function (event) {
                        this.scrollTop = scrollStartPos - event.touches[0].pageY;
                    }, false);
                }
            }
        }]);
        return Popup;
    }(ol.Overlay);
    
    return Popup;
});
