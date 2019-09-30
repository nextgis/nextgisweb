define([
        'dojo/_base/declare',
        'dojo/topic',
        'openlayers/ol'
    
    ], function (declare, topic, ol) {
        
        /**
         * This file is part of ol-mapscale package.
         * @module ol-mapscale
         * @author Vladimir Vershinin
         */
        
        /**
         * @param {string} tagName
         * @param {string|string[]} [classes]
         * @returns {Element}
         */
        function createElement(tagName, classes) {
            var elem = document.createElement(tagName);
            
            if (classes) {
                elem.classList.add.apply(elem.classList, typeof classes === 'string' ? classes.split(' ') : classes);
            }
            
            return elem;
        }
        
        /**
         * Calculates screen DPI based on css style.
         *
         * @returns {number|undefined}
         */
        
        
        /**
         * Formats number.
         *
         * @param {number} num
         * @param {number} digits
         * @param {string[]} units
         * @returns {string}
         */
        function formatNumber(num) {
            var digits = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
            var units = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ['k', 'M', 'G'];
            
            for (var i = units.length - 1; i >= 0; i--) {
                var decimal = Math.pow(1000, i + 1);
                
                if (num <= -decimal || num >= decimal) {
                    return parseFloat(num / decimal).toFixed(digits) + units[i];
                }
            }
            
            return num;
        }
        
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
        
        
        var get = function get(object, property, receiver) {
            if (object === null) object = Function.prototype;
            var desc = Object.getOwnPropertyDescriptor(object, property);
            
            if (desc === undefined) {
                var parent = Object.getPrototypeOf(object);
                
                if (parent === null) {
                    return undefined;
                } else {
                    return get(parent, property, receiver);
                }
            } else if ('value' in desc) {
                return desc.value;
            } else {
                var getter = desc.get;
                
                if (getter === undefined) {
                    return undefined;
                }
                
                return getter.call(receiver);
            }
        };
        
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
         * This file is part of ol-mapscale package.
         * @module ol-mapscale
         * @author Vladimir Vershinin
         */
        var Control = ol.control.Control;
        var ScaleLineControl = ol.control.ScaleLine;
        var DOTS_PER_INCH = 96;
        var INCHES_PER_METER = 39.3701;
        
        /**
         * MapScale control class.
         *
         * @class
         * @extends {ol.control.Control}
         * @author Vladimir Vershinin
         */
        
        var MapScaleControl = function (_Control) {
            inherits(MapScaleControl, _Control);
            
            /**
             * @param {MapScaleControlOptions} options
             */
            function MapScaleControl() {
                var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
                classCallCheck(this, MapScaleControl);
                
                var className = options.className || 'ol-mapscale';
                var scaleLineClassName = options.scaleLineClassName || 'ol-scale-line';
                var scaleValueClassName = options.scaleLineClassName || 'ol-scale-value';
                var render = MapScaleControl.render;
                var target = options.target;
                
                var element = createElement('div', className);
                
                /**
                 * @type {string[]}
                 * @private
                 */
                var _this = possibleConstructorReturn(this, (MapScaleControl.__proto__ || Object.getPrototypeOf(MapScaleControl)).call(this, {
                    element: element,
                    render: render,
                    target: target
                }));
                
                /**
                 * @type {number}
                 * @private
                 */
                _this.units_ = options.units;
                /**
                 * @type {Function}
                 * @private
                 */
                _this.formatNumber_ = options.formatNumber;
                /**
                 * @type {number}
                 * @private
                 */
                _this.digits_ = options.digits;
                /**
                 * @type {Element}
                 * @private
                 */
                _this.scaleValueElement_ = createElement('div', scaleValueClassName);
                element.appendChild(_this.scaleValueElement_);
                
                /**
                 * @type {String}
                 * @private
                 */
                _this.previousScaleValue_ = null;
                
                /**
                 * @private
                 * @type {olx.ViewState}
                 */
                _this.viewState_ = undefined;
                
                /**
                 * @type {ol.control.ScaleLine}
                 * @protected
                 */
                _this.scaleLine_ = undefined;
                if (typeof options.scaleLine === 'undefined' || options.scaleLine) {
                    var scaleLineElement = createElement('div', 'ol-scale-line-target');
                    element.appendChild(scaleLineElement);
                    
                    _this.scaleLine_ = new ScaleLineControl({
                        target: scaleLineElement,
                        className: scaleLineClassName
                    });
                    
                    _this.scaleLine_.on('change:units', _this.handleUnitsChanged_.bind(_this));
                }
                return _this;
            }
            
            /**
             * @param {ol.MapEvent} mapEvent
             * @this {MapScaleControl}
             */
            
            
            createClass(MapScaleControl, [{
                key: 'setMap',
                
                
                /**
                 * @param {ol.Map} map
                 */
                value: function setMap(map) {
                    this.scaleLine_ && this.scaleLine_.setMap(map);
                    get(MapScaleControl.prototype.__proto__ || Object.getPrototypeOf(MapScaleControl.prototype),
                        'setMap', this).call(this, map);
                }
                
                /**
                 * @private
                 */
                
            }, {
                key: 'handleUnitsChanged_',
                value: function handleUnitsChanged_() {
                    this.updateElement_();
                }
                
                /**
                 * @private
                 */
                
            },
                {
                    key: 'updateElement_',
                    value: function updateElement_() {
                        var viewState = this.viewState_;
                        
                        if (viewState) {
                            var resolution = viewState.resolution;
                            var projection = viewState.projection;
                            var center = viewState.center;
                            var pointResolution = ol.proj.getPointResolution(projection, resolution, center, ol.proj.Units.METERS);
                            var scale = Math.round(pointResolution * INCHES_PER_METER * DOTS_PER_INCH);
                            var formatNumber_ = this.formatNumber_ || formatNumber;
                            var scaleValue;
                            if (this.formatNumber_) {
                                scaleValue = this.formatNumber_(scale);
                            } else {
                                scaleValue = formatNumber_(scale, this.digits_, this.units_);
                            }
                            if (this.previousScaleValue_ !== scaleValue) {
                                this.previousScaleValue_ = scaleValue;
                                topic.publish('ol/mapscale/changed', scaleValue);
                            }
                            this.scaleValueElement_.innerHTML = '1 : ' + scaleValue;
                        }
                    }
                }], [{
                key: 'render',
                value: function render(mapEvent) {
                    var frameState = mapEvent.frameState;
                    
                    if (frameState == null) {
                        this.viewState_ = null;
                    } else {
                        this.viewState_ = frameState.viewState;
                    }
                    
                    this.updateElement_();
                }
            }]);
            return MapScaleControl;
        }(Control);
        
        return MapScaleControl;
    }
);
