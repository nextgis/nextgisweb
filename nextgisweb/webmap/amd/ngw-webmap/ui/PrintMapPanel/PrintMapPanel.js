define([
    'dojo/_base/declare', 'dojo/topic',
    'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
    'dojo/_base/array', 'dojo/_base/lang', 'dojo/on',
    'dojo/query', 'dojo/aspect', 'dojo/_base/window', 'dojo/dom-style',
    'dojo/dom', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/Deferred',
    'ngw-pyramid/dynamic-panel/DynamicPanel', 'dijit/layout/BorderContainer',
    'dojox/layout/TableContainer', 'dojox/dtl', 'dojox/dtl/Context',
    'dijit/form/TextBox', 'dijit/form/NumberTextBox', 'dijit/form/DropDownButton',
    'dijit/DropDownMenu', 'dijit/MenuItem', 'dijit/Toolbar',
    'ngw-pyramid/i18n!webmap', 'ngw-pyramid/hbs-i18n',
    'ngw/openlayers/Map', 'openlayers/ol', 'openlayers/ol-mapscale',
    'dojo/text!./PrintMapPanel.hbs', 'dojo/text!./PrintingPageStyle.css.dtl',
    'dijit/form/Select', 'dijit/TooltipDialog',
    'xstyle/css!./PrintMapPanel.css',
    'dom-to-image/dom-to-image'
], function (
    declare, topic,
    _TemplatedMixin, _WidgetsInTemplateMixin,
    array, lang, on,
    query, aspect, win, domStyle,
    dom, domClass, domConstruct, Deferred,
    DynamicPanel, BorderContainer,
    TableContainer, dtl, dtlContext,
    TextBox, NumberTextBox, DropdownButton,
    DropDownMenu, MenuItem, Toolbar,
    i18n, hbsI18n,
    Map, ol, olMapScale,
    template, printingCssTemplate) {
    return declare([DynamicPanel, BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
        
        map: 'undefined',
        id: 'printMapDialog',
        contentId: 'printMapContent',
        printElement: null,
        printElementMap: null,
        printMap: null,
        printCssElement: null,
        isFullWidth: true,
        mode: 'format', // 'format', 'custom'
        _mapScale: null,
        
        constructor: function (options) {
            declare.safeMixin(this, options);
            
            this.withTitle = false;
            this.withCloser = false;
            
            this.contentWidget = new (declare([BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: hbsI18n(template, i18n),
                region: 'top',
                gutters: false
            }));
        },
        
        postCreate: function () {
            this.inherited(arguments);
            
            on(this.contentWidget.printButton, 'click', lang.hitch(this, function () {
                window.print();
            }));
            
            on(this.contentWidget.exportJpegButton, 'click', lang.hitch(this, function () {
                this._buildPrintCanvas('jpeg').then(lang.hitch(this, function (hrefCanvasEl) {
                    hrefCanvasEl.click();
                }));
            }));
            
            on(this.contentWidget.exportPngButton, 'click', lang.hitch(this, function () {
                this._buildPrintCanvas('png').then(lang.hitch(this, function (hrefCanvasEl) {
                    hrefCanvasEl.click();
                }));
            }));
            
            on(this.contentWidget.sizesSelect, 'change', lang.hitch(this, function () {
                var sizeValues = this.contentWidget.sizesSelect.get('value'),
                    parsedSizeValues, height, width;
                
                if (sizeValues === 'custom') {
                    this._setMode('custom');
                } else if (sizeValues && sizeValues != 'none') {
                    this._setMode('format');
                    parsedSizeValues = sizeValues.split('_');
                    width = parsedSizeValues[0];
                    height = parsedSizeValues[1];
                    this.contentWidget.heightInput.set('value', height);
                    this.contentWidget.widthInput.set('value', width);
                    this._resizeMapContainer(width, height);
                }
            }));
            
            topic.subscribe('ol/mapscale/changed', lang.hitch(this, function (scaleValue) {
                this._setCurrentScale(scaleValue);
            }));
            
            on(this.contentWidget.scalesSelect, 'change', lang.hitch(this, function () {
                var scale = this.contentWidget.scalesSelect.get('value');
                
                var view = this.printMap.olMap.getView();
                var center = view.getCenter();
                var pointResolution3857 = Math.cosh(center[1] / 6378137);
                var resolution = pointResolution3857 * (parseInt(scale, 10) / (96 * 39.3701));
                this.printMap.olMap.getView().setResolution(resolution);
            }));
            
            on(this.contentWidget.scaleDisplay, 'change', lang.hitch(this, function (value) {
                this._onScaleCheckboxChange(value, 'value');
            }));
            
            on(this.contentWidget.scaleBar, 'change', lang.hitch(this, function (value) {
                this._onScaleCheckboxChange(value, 'line');
            }));
        },
        
        _onScaleCheckboxChange: function (value, cssClass) {
            if (!this._mapScale) return;
            var element = this._mapScale.element;
            if (value) {
                domClass.add(element, cssClass);
            } else {
                domClass.remove(element, cssClass);
            }
        },
        
        _setCurrentScale: function (scaleValue) {
            this.contentWidget.scalesSelect.updateOption({value: 'none', label: '1 : ' + scaleValue, selected: true});
        },
        
        /**
         * Build canvas for printing image.
         *
         * @param {string} imageType - "png" or "jpeg"
         * @return {Deferred} A good string
         */
        _buildPrintCanvas: function (imageType) {
            var deferred = new Deferred(),
                domToImagePromise;
            
            switch (imageType) {
                case 'png':
                    domToImagePromise = domtoimage.toPng(this.printMap.olMap.getViewport());
                    break;
                case 'jpeg':
                    domToImagePromise = domtoimage.toJpeg(this.printMap.olMap.getViewport());
                    break;
                default:
                    console.error('Image type "' + imageType + '" is unknown.');
            }
            
            domToImagePromise.then(lang.hitch(this, function (dataUrl) {
                var hrefCanvasEl = this._buildHrefCanvasElement(dataUrl);
                deferred.resolve(hrefCanvasEl);
            })).catch(function (error) {
                console.error(error);
                deferred.reject(error);
            });
            
            return deferred.promise;
        },
        
        _buildHrefCanvasElement: function (dataUrl) {
            var img, a;
            
            domConstruct.destroy('printMapCanvas');
            
            img = new Image();
            img.src = dataUrl;
            img.title = 'NextGIS web map';
            a = document.createElement('a');
            a.id = 'printMapCanvas';
            a.href = dataUrl;
            a.download = 'NextGIS web map';
            a.appendChild(img);
            document.body.appendChild(a);
            
            return a;
        },
        
        _setMode: function (newMode) {
            if (this.mode === newMode) {
                return false;
            }
            
            if (newMode === 'format') {
                this._setFormatMode();
            }
            
            if (newMode === 'custom') {
                this._setCustomMode();
            }
        },
        
        _setFormatMode: function () {
            this._disableInput(this.contentWidget.heightInput, true);
            this._disableInput(this.contentWidget.widthInput, true);
            this._disableInput(this.contentWidget.marginInput, true);
            this.contentWidget.marginInput.set('value', 10);
            this.mode = 'format';
        },
        
        _setCustomMode: function () {
            this._disableInput(this.contentWidget.heightInput, false);
            this._disableInput(this.contentWidget.widthInput, false);
            this._disableInput(this.contentWidget.marginInput, false);
            
            on(this.contentWidget.heightInput, 'change', lang.hitch(this, function (newHeight) {
                this._resizeMapContainer(null, newHeight);
            }));
            
            on(this.contentWidget.widthInput, 'change', lang.hitch(this, function (newWidth) {
                this._resizeMapContainer(newWidth);
            }));
            
            on(this.contentWidget.marginInput, 'change', lang.hitch(this, function (newMargin) {
                this._resizeMapContainer(null, null, newMargin);
            }));
            
            this.mode = 'custom';
        },
        
        _disableInput: function (input, isDisabled) {
            input.set('disabled', isDisabled);
        },
        
        show: function () {
            this.inherited(arguments);
            
            this._buildPrintElement();
            this._buildMap();
            this.contentWidget.sizesSelect.attr('value', '210_297');
            this.contentWidget.scaleDisplay.attr('checked', false);
            this.contentWidget.scaleBar.attr('checked', false);
        },
        
        _resizeMapContainer: function (width, height, margin) {
            width = width || this.contentWidget.widthInput.get('value');
            height = height || this.contentWidget.heightInput.get('value');
            margin = margin || this.contentWidget.marginInput.get('value');
            
            this._buildPageStyle(width, height, margin);
            this.printMap.olMap.updateSize();
            this._setPrintMapExtent();
        },
        
        hide: function () {
            this.inherited(arguments);
            array.forEach(this.printMap.olMap.getLayers().getArray(), function (layer) {
                this.printMap.olMap.removeLayer(layer);
            }, this);
            this.printMap.olMap.setTarget(null);
            this.printMap.olMap = null;
            domClass.add(this.printElement, 'inactive');
            this._removePageStyle();
            this.contentWidget.sizesSelect.attr('value', 'none');
            
            domConstruct.destroy(this.printCssElement);
        },
        
        _buildPrintElement: function () {
            var printElement = this.contentWidget.mapContainer;
            domConstruct.empty(printElement);
            domClass.remove(printElement, 'inactive');
            this.printElement = printElement;
        },
        
        _buildMap: function () {
            var mapContainer = this.contentWidget.mapContainer;
            
            this.printMap = new Map({
                target: mapContainer,
                controls: [],
                interactions: ol.interaction.defaults({
                    doubleClickZoom: true,
                    dragAndDrop: true,
                    keyboardPan: true,
                    keyboardZoom: true,
                    mouseWheelZoom: true,
                    pointer: false,
                    select: false
                }),
                view: new ol.View({
                    center: this.map.getView().getCenter(),
                    zoom: this.map.getView().getZoom()
                })
            });
            
            this._mapScale = new olMapScale({
                formatNumber: function (scale) {
                    return Math.round(scale / 1000) * 1000;
                }
            });
            this.printMap.olMap.addControl(this._mapScale);
            
            aspect.after(mapContainer, 'resize', lang.hitch(this, function () {
                this.printMap.olMap.updateSize();
            }));
            
            array.forEach(this.map.getLayers().getArray(), function (layer) {
                if (layer.getVisible()) {
                    this.printMap.olMap.addLayer(layer);
                }
            }, this);
            
            array.forEach(this.map.getOverlays().getArray(), this._buildAnnotationOverlay, this);
            
            this._setPrintMapExtent();
            this._buildLogo();
        },
        
        _buildAnnotationOverlay: function (overlay) {
            if ('annFeature' in overlay && overlay.annFeature) {
                var clonedPopup = overlay.cloneOlPopup(overlay.annFeature);
                this.printMap.olMap.addOverlay(clonedPopup);
            }
        },
        
        _buildLogo: function () {
            var logoElement = query('.map-logo')[0],
                newLogoElement,
                olViewport = query('div.ol-viewport', this.printElement)[0];
            
            newLogoElement = lang.clone(logoElement);
            domConstruct.place(newLogoElement, olViewport, 'last');
        },
        
        _setPrintMapExtent: function () {
            this.map.getView().setCenter(this.map.getView().getCenter());
            this.map.getView().setZoom(this.map.getView().getZoom());
        },
        
        _buildPageStyle: function (width, height, margin) {
            var style = this._getPageStyle(),
                template, context;
            
            template = new dtl.Template(printingCssTemplate);
            context = new dtlContext({
                widthPage: width,
                heightPage: height,
                widthMap: width - margin * 2,
                heightMap: height - margin * 2,
                margin: margin
            });
            style.innerHTML = template.render(context);
        },
        
        _pageStyle: null,
        _getPageStyle: function () {
            if (this._pageStyle) {
                return this._pageStyle;
            }
            
            var style = document.createElement('style');
            style.type = 'text/css';
            style.appendChild(document.createTextNode(''));
            document.head.appendChild(style);
            this._pageStyle = style;
            return style;
        },
        
        _removePageStyle: function () {
            if (this._pageStyle) {
                domConstruct.destroy(this._pageStyle);
                this._pageStyle = null;
            }
        }
    });
});
