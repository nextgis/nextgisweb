/* global domtoimage */
define([
    "dojo/_base/declare",
    "dojo/topic",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/webmap/print-map-panel",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/debounce",
    "dojo/on",
    "dojo/query",
    "dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/Deferred",
    "handlebars/handlebars",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    "@nextgisweb/pyramid/i18n!",
    "ngw-webmap/ol/Map",
    "openlayers/ol",
    "../../ol-ext/ol-mapscale",
    "../../ol-ext/DragZoomUnConstrained",
    "dojo/text!./PrintingPageStyle.css.hbs",
    "dojo/text!./PrintMapPanel.hbs",
    // Template dependencies
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    // Side effects
    "xstyle/css!./PrintMapPanel.css",
    "./dom-to-image",
], function (
    declare,
    topic,
    reactApp,
    printMapPanelComp,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    array,
    lang,
    debounce,
    on,
    query,
    aspect,
    domClass,
    domConstruct,
    Deferred,
    handlebars,
    DynamicPanel,
    BorderContainer,
    i18n,
    Map,
    ol,
    olMapScale,
    DragZoomUnConstrained,
    printingCssTemplate,
    template
) {
    return declare(
        [
            DynamicPanel,
            BorderContainer,
            _TemplatedMixin,
            _WidgetsInTemplateMixin,
        ],
        {
            map: undefined,
            id: "printMapDialog",
            contentId: "printMapContent",
            printElement: null,
            printMap: null,
            printCssElement: null,
            isFullWidth: true,
            _mapScale: null,
            _mapSizes: undefined,
            _scalesControls: {
                value: false,
                line: false,
            },

            constructor: function (options) {
                declare.safeMixin(this, options);

                this.withTitle = false;
                this.withCloser = false;

                this.contentWidget = new (declare(
                    [BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin],
                    {
                        templateString: i18n.renderTemplate(template),
                        region: "top",
                        gutters: false,
                    }
                ))();
            },

            makeComp: function (contentNode, options, scaleMap) {
                reactApp.default(
                    printMapPanelComp.default,
                    {
                        display: options.display,
                        onAction: (action, payload) => {
                            this._handleAction(action, payload);
                        },
                        scaleMap,
                    },
                    contentNode.querySelector(".print-panel-content")
                );
            },

            postCreate: function () {
                this.inherited(arguments);

                topic.subscribe(
                    "ol/mapscale/changed",
                    lang.hitch(
                        this,
                        debounce((scaleValue) => {
                            this.makeComp(
                                this.contentNode,
                                this.options,
                                scaleValue
                            );
                        }, 500)
                    )
                );

                on(this.contentWidget.closePanel, "click", () => {
                    this.hide();
                });
            },

            _handleAction: function (action, payload) {
                if (action === "change-map-size") {
                    this._mapSizes = payload;
                    this._resizeMapContainer();
                    this._updateMapSize();
                }

                if (action === "change-scale") {
                    this._setMapScale(payload);
                }

                if (action === "change-scale-controls") {
                    this._changeScaleControls(payload.value, payload.type);
                }

                if (action === "export") {
                    this._buildPrintCanvas(payload).then(
                        lang.hitch(this, function (hrefCanvasEl) {
                            hrefCanvasEl.click();
                        })
                    );
                }
            },

            _setMapScale: function (scale) {
                const view = this.printMap.olMap.getView();
                const center = view.getCenter();
                const cosh = function (value) {
                    return (Math.exp(value) + Math.exp(-value)) / 2;
                };
                const pointResolution3857 = cosh(center[1] / 6378137);
                const resolution =
                    pointResolution3857 *
                    (parseInt(scale, 10) / (96 * 39.3701));
                this.printMap.olMap.getView().setResolution(resolution);
            },

            _changeScaleControls: function (value, type) {
                if (!this._mapScale) return;
                const element = this._mapScale.element;
                if (value) {
                    domClass.add(element, type);
                } else {
                    domClass.remove(element, type);
                }
                this._scalesControls[type] = value;
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

                this._resizeMapContainer();
                this._updateMapSize();

                switch (imageType) {
                    case "png":
                        domToImagePromise = domtoimage.toPng(
                            this.contentWidget.mapPageContainer
                        );
                        break;
                    case "jpeg":
                        domToImagePromise = domtoimage.toJpeg(
                            this.contentWidget.mapPageContainer
                        );
                        break;
                    default:
                        console.error(
                            'Image type "' + imageType + '" is unknown.'
                        );
                }

                domToImagePromise
                    .then(
                        lang.hitch(this, function (dataUrl) {
                            var hrefCanvasEl = this._buildHrefCanvasElement(
                                dataUrl,
                                imageType
                            );
                            deferred.resolve(hrefCanvasEl);
                        })
                    )
                    .catch(function (error) {
                        console.error(error);
                        deferred.reject(error);
                    });

                return deferred.promise;
            },

            _buildHrefCanvasElement: function (dataUrl, extension) {
                var webMapTitle = this._getWebMapTitle(),
                    img,
                    a;

                domConstruct.destroy("printMapCanvas");

                img = new Image();
                img.src = dataUrl;
                a = document.createElement("a");
                a.id = "printMapCanvas";
                a.href = dataUrl;
                a.download = webMapTitle + "." + extension;
                a.appendChild(img);
                document.body.appendChild(a);

                return a;
            },

            _getWebMapTitle: function () {
                var titleElement = query(".header__title__inner")[0];
                if (titleElement && titleElement.textContent) {
                    return titleElement.textContent.trim();
                } else {
                    return "NextGIS web map";
                }
            },

            show: function () {
                this.inherited(arguments);

                this._buildPrintElement();
                this._resizeMapContainer();
                this._buildMap();
                this._updateMapSize();
            },

            _resizeMapContainer: function () {
                if (!this._mapSizes) return;
                const { width, height, margin } = this._mapSizes;
                this._buildPageStyle(width, height, margin);
            },

            _updateMapSize() {
                if (!this.printMap || !this.printMap.olMap) return;
                this.printMap.olMap.updateSize();
            },

            hide: function () {
                this.inherited(arguments);
                array.forEach(
                    this.printMap.olMap.getLayers().getArray(),
                    function (layer) {
                        this.printMap.olMap.removeLayer(layer);
                    },
                    this
                );
                this.printMap.olMap.setTarget(null);
                this.printMap.olMap = null;
                domClass.add(this.printElement, "inactive");
                this._removePageStyle();

                domConstruct.destroy(this.printCssElement);
            },

            _buildPrintElement: function () {
                var printElement = this.contentWidget.mapContainer;
                domConstruct.empty(printElement);
                domClass.remove(printElement, "inactive");
                this.printElement = printElement;
            },

            _buildMap: function () {
                if (!this._mapSizes || !this.contentWidget.mapContainer) {
                    return;
                }

                var mapContainer = this.contentWidget.mapContainer,
                    interactions;

                interactions = ol.interaction.defaults({
                    doubleClickZoom: true,
                    dragAndDrop: true,
                    keyboardPan: true,
                    keyboardZoom: true,
                    mouseWheelZoom: true,
                    pointer: false,
                    select: false,
                    shiftDragZoom: false,
                });

                this.printMap = new Map({
                    target: mapContainer,
                    controls: [],
                    interactions: interactions.extend([
                        new DragZoomUnConstrained(),
                    ]),
                    view: new ol.View({
                        center: this.map.getView().getCenter(),
                        zoom: this.map.getView().getZoom(),
                    }),
                });

                this._mapScale = new olMapScale({
                    formatNumber: function (scale) {
                        return Math.round(scale / 1000) * 1000;
                    },
                });
                this.printMap.olMap.addControl(this._mapScale);

                aspect.after(
                    mapContainer,
                    "resize",
                    lang.hitch(this, function () {
                        this.printMap.olMap.updateSize();
                    })
                );

                array.forEach(
                    this.map.getLayers().getArray(),
                    function (layer) {
                        if (layer.getVisible()) {
                            this.printMap.olMap.addLayer(layer);
                        }
                    },
                    this
                );

                array.forEach(
                    this.map.getOverlays().getArray(),
                    this._buildAnnotationOverlay,
                    this
                );

                this._buildLogo();
                this._buildScalesControls();
            },

            _buildAnnotationOverlay: function (overlay) {
                if ("annPopup" in overlay && overlay.annPopup) {
                    const annPopup = overlay.annPopup;
                    const clonedPopup = annPopup.cloneOlPopup(
                        annPopup.getAnnFeature()
                    );
                    this.printMap.olMap.addOverlay(clonedPopup);
                }
            },

            _buildLogo: function () {
                var mapLogoQuery = query(".map-logo"),
                    newLogoElement,
                    olViewport = query("div.ol-viewport", this.printElement)[0];

                if (mapLogoQuery.length === 0) return false;

                newLogoElement = lang.clone(mapLogoQuery[0]);
                domConstruct.place(newLogoElement, olViewport, "last");
            },

            _buildScalesControls: function () {
                for (const [type, value] of Object.entries(
                    this._scalesControls
                )) {
                    this._changeScaleControls(value, type);
                }
            },

            _buildPageStyle: function (width, height, margin) {
                const compiled = handlebars.compile(printingCssTemplate);
                const html = compiled({
                    widthPage: width,
                    heightPage: height,
                    widthMap: width - margin * 2,
                    heightMap: height - margin * 2,
                    margin: margin,
                });
                this._getPageStyle().innerHTML = html;
            },

            _pageStyle: null,
            _getPageStyle: function () {
                if (this._pageStyle) {
                    return this._pageStyle;
                }

                const elStyle = document.createElement("style");
                elStyle.type = "text/css";
                elStyle.rel = "stylesheet";
                elStyle.appendChild(document.createTextNode(""));
                document.head.appendChild(elStyle);
                this._pageStyle = elStyle;
                return elStyle;
            },

            _removePageStyle: function () {
                if (this._pageStyle) {
                    domConstruct.destroy(this._pageStyle);
                    this._pageStyle = null;
                }
            },
        }
    );
});
