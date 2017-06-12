define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/aspect',
    'dojo/_base/window',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Dialog',
    'dojo/on',
    'dojox/layout/TableContainer',
    'dojox/dtl',
    'dojox/dtl/Context',
    'dijit/form/TextBox',
    'dijit/form/NumberTextBox',
    'ngw/openlayers/Map',
    'openlayers/ol',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    'dojo/text!./PrintMap.hbs',
    'dojo/text!./PrintingPageStyle.css.dtl',
    'xstyle/css!./PrintMap.css'
], function (declare, query, aspect, win, domStyle, domClass, domConstruct,
             array, lang, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin,
             Dialog, on, TableContainer, dtl, dtlContext, TextBox, NumberTextBox,
             Map, ol, i18n, hbsI18n, template, printingCssTemplate) {

    var PrintMapDialog = declare([Dialog], {
        id: 'printMapDialog',
        contentId: 'printMapContent',
        title: i18n.gettext('Print map'),
        isDestroyedAfterHiding: true,
        isClosedAfterButtonClick: true,
        template: hbsI18n(template, i18n),
        printElementId: 'printMap',
        printElement: null,
        printElementMap: null,
        printMap: null,
        style: 'width: 100%; height: 100%;',
        printCssElement: null,

        constructor: function (settings) {
            lang.mixin(this, settings);

            var contentWidget = new (declare([_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
                id: this.contentId,
                templateString: hbsI18n(template, i18n),
                message: this.message,
                buttonOk: this.buttonOk,
                buttonCancel: this.buttonCancel,
                style: 'width: 100%; height: 100%;'
            }));

            contentWidget.startup();
            this.content = contentWidget;

            this.hide = this._hideDialog;
        },

        postCreate: function () {
            this.inherited(arguments);

            this.set('draggable', false);

            on(this.content.okButton, 'click', lang.hitch(this, function () {
                window.print();
            }));

            on(this.content.cancelButton, 'click', lang.hitch(this, function () {
                this.hide();
            }));

            on(this.content.sizesSelect, 'change', lang.hitch(this, function () {
                var sizeValues = this.content.sizesSelect.get('value'),
                    parsedSizeValues, height, width;
                if (sizeValues === 'custom') {

                } else {
                    parsedSizeValues = sizeValues.split('_');
                    width = parsedSizeValues[0];
                    height = parsedSizeValues[1];
                    this.content.heightInput.set('value', height);
                    this.content.widthInput.set('value', width);
                    this._resizeMapContainer(width, height);
                }
            }));
        },

        _onResizeWindowSubscriber: null,
        show: function () {
            this.inherited(arguments);

            this._onResizeWindow();
            this._onResizeWindowSubscriber = on(win.global, 'resize', lang.hitch(this, this._onResizeWindow));

            this._buildPrintElement();
            this._buildMap();
            this.content.sizesSelect.attr('value', '210_297');
        },

        _onResizeWindow: function () {
            var bodyStyle = domStyle.getComputedStyle(document.body),
                w = parseInt(bodyStyle.width, 10),
                h = parseInt(bodyStyle.height, 10);
            this.resize({w: w, h: h, l: 0, t: 0});
        },

        _hideDialog: function () {
            this.printMap.olMap.setTarget(null);
            this.printMap.olMap = null;
            domClass.add(this.printElement, 'inactive');
            this._removePageStyle();
            if (this._onResizeWindowSubscriber) {
                this._onResizeWindowSubscriber.remove();
                this._onResizeWindowSubscriber = null;
            }
            this.destroyRecursive();
            domConstruct.destroy(this.printCssElement);
        },

        _buildPrintElement: function () {
            var printElement = document.getElementById(this.printElementId);
            if (printElement === null) {
                var node = domConstruct.toDom('<div id="' + this.printElementId + '"><div class="map-container map"></div></div>');
                this.printElement = domConstruct.place(node, document.body, 'last');
                this.printElementMap = query('div.map-container', this.printElement)[0];
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
                this.printMap.olMap.addLayer(layer);
            }, this);

            this._setPrintMapExtent();
            this._buildLogo();
        },

        _buildLogo: function () {
            var logoElement = query('img.map-logo')[0],
                newLogoElement,
                olViewport = query('div.ol-viewport', this.printElement)[0];

            newLogoElement = lang.clone(logoElement);
            domConstruct.place(newLogoElement, olViewport, 'last');
        },

        _setPrintMapExtent: function () {
            this.map.getView().setCenter(this.map.getView().getCenter());
            this.map.getView().setZoom(this.map.getView().getZoom());
        },

        _resizeMapContainer: function (width, height) {
            var margin = this.content.marginInput.get('value');

            this._buildPageStyle(width, height, margin);
            this.printMap.olMap.updateSize();
            this._setPrintMapExtent();
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
            }
        }
    });

    return {
        run: function (olMap) {
            var printMapDialog = new PrintMapDialog({
                map: olMap
            });
            printMapDialog.show();
        }
    };
});
