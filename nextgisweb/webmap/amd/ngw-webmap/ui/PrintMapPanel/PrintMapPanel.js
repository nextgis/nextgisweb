define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/query',
    'dojo/aspect',
    'dojo/_base/window',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-construct',
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    'dojox/layout/TableContainer',
    'dojox/dtl',
    'dojox/dtl/Context',
    'dijit/form/TextBox',
    'dijit/form/NumberTextBox',
    "dijit/form/DropDownButton",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/Toolbar",
    'ngw/openlayers/Map',
    'openlayers/ol',
    "dojo/text!./PrintMapPanel.hbs",
    'dojo/text!./PrintingPageStyle.css.dtl',

    //templates

    "dijit/form/Select",
    "xstyle/css!./PrintMapPanel.css"
], function (
    declare,
    i18n,
    hbsI18n,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    array,
    lang,
    on,
    query,
    aspect,
    win,
    domStyle,
    domClass,
    domConstruct,
    DynamicPanel,
    BorderContainer,
    TableContainer,
    dtl,
    dtlContext,
    TextBox,
    NumberTextBox,
    DropdownButton,
    DropDownMenu,
    MenuItem,
    Toolbar,
    Map,
    ol,
    template,
    printingCssTemplate) {
    return declare([DynamicPanel, BorderContainer,_TemplatedMixin, _WidgetsInTemplateMixin],{

        map: "undefined",
        id: 'printMapDialog',
        contentId: 'printMapContent',
        printElementId: 'printMap',
        printElement: null,
        printElementMap: null,
        printMap: null,
        printCssElement: null,
        isFullWidth: true,
        mode: 'format', // 'format', 'custom'

        constructor: function (options) {
            declare.safeMixin(this,options);

            this.contentWidget = new (declare([BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: hbsI18n(template, i18n),
                region: 'top',
                gutters: false
            }));
        },

        postCreate: function(){
            this.inherited(arguments);

            on(this.contentWidget.okButton, 'click', lang.hitch(this, function () {
                window.print();
            }));

            on(this.contentWidget.cancelButton, 'click', lang.hitch(this, function () {
                this.hide();
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

        show: function(){
            this.inherited(arguments);

            this._buildPrintElement();
            this._buildMap();
            this.contentWidget.sizesSelect.attr('value', '210_297');
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
            var printElement = document.getElementById(this.printElementId);
            if (printElement === null) {
                var node = domConstruct.toDom('<div id="' + this.printElementId + '"><div class="map-container map"></div></div>');
                this.printElement = domConstruct.place(node, document.body, 'last');
                this.printElementMap = query('div.map-container', this.printElement)[0];
                this.printElement.style.top = 244 + document.getElementById("header").offsetHeight + 'px';

                on(window, "resize", lang.hitch(this, function(){
                    console.log("resize");
                    this.printElement.style.top = 244 + document.getElementById("header").offsetHeight + 'px';
                }));
            } else {
                domConstruct.empty(query('div.map-container', this.printElement)[0]);
                domClass.remove(printElement, 'inactive');
                this.printElement = printElement;
            }
        },

        _buildMap: function () {
            var mapContainer = query('div.map-container', this.printElement)[0];

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

            aspect.after(mapContainer, 'resize', lang.hitch(this, function () {
                this.printMap.olMap.updateSize();
            }));

            array.forEach(this.map.getLayers().getArray(), function (layer) {
                if (layer.getVisible()) {
                    this.printMap.olMap.addLayer(layer);
                }
            }, this);

            this._setPrintMapExtent();
            this._buildLogo();
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
            style.type = "text/css";
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