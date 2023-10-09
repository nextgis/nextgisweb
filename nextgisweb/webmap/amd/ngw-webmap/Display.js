define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/aspect",
    "dojo/dom-construct",
    "dojo/topic",
    "dojo/data/ItemFileWriteStore",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "openlayers/ol",
    "@nextgisweb/gui/error",
    "@nextgisweb/pyramid/icon",
    "@nextgisweb/pyramid/company-logo",
    "@nextgisweb/webmap/store",
    "@nextgisweb/webmap/panels-manager",
    "@nextgisweb/webmap/store/annotations",
    "./ol/Map",
    "./MapToolbar",
    "./controls/InitialExtent",
    "./controls/InfoScale",
    "./controls/MyLocation",
    "./FeatureHighlighter",
    "./MapStatesObserver",
    "./ui/react-panel",
    "./ui/react-webmap-tabs",
    // tools
    "./tool/Zoom",
    "./tool/Measure",
    "./tool/Identify",
    "./tool/ViewerInfo",
    "./tool/Swipe",
    // panels
    "@nextgisweb/webmap/panel/layers",
    "./ui/PrintMapPanel/PrintMapPanel",
    // utils
    "./utils/URL",
    // settings
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/pyramid/settings!",
    "dojo/text!./template/Display.hbs",
    // template
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    // css
    "xstyle/css!./template/resources/Display.css",
], function (
    declare,
    lang,
    array,
    Deferred,
    all,
    aspect,
    domConstruct,
    topic,
    ItemFileWriteStore,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ContentPane,
    ol,
    errorModule,
    icon,
    companyLogo,
    WebmapStore,
    PanelsManager,
    AnnotationsStore,
    Map,
    MapToolbar,
    InitialExtent,
    InfoScale,
    MyLocation,
    FeatureHighlighter,
    MapStatesObserver,
    reactPanel,
    ReactWebMapTabs,
    ToolZoom,
    ToolMeasure,
    Identify,
    ToolViewerInfo,
    ToolSwipe,
    LayersPanelModule,
    PrintMapPanel,
    URL,
    { gettext, renderTemplate },
    settings,
    template
) {
    var CustomItemFileWriteStore = declare([ItemFileWriteStore], {
        dumpItem: function (item) {
            var obj = {};

            if (item) {
                var attributes = this.getAttributes(item);

                if (attributes && attributes.length > 0) {
                    var i;

                    for (i = 0; i < attributes.length; i++) {
                        var values = this.getValues(item, attributes[i]);

                        if (values) {
                            if (values.length > 1) {
                                var j;

                                obj[attributes[i]] = [];
                                for (j = 0; j < values.length; j++) {
                                    var value = values[j];

                                    if (this.isItem(value)) {
                                        obj[attributes[i]].push(
                                            this.dumpItem(value)
                                        );
                                    } else {
                                        obj[attributes[i]].push(value);
                                    }
                                }
                            } else {
                                if (this.isItem(values[0])) {
                                    obj[attributes[i]] = this.dumpItem(
                                        values[0]
                                    );
                                } else {
                                    obj[attributes[i]] = values[0];
                                }
                            }
                        }
                    }
                }
            }

            return obj;
        },
    });

    var LoggedDeferred = declare(Deferred, {
        constructor: function (name) {
            this.then(
                function () {
                    console.log("Deferred object [%s] resolved", name);
                },
                function () {
                    console.error("Deferred object [%s] rejected", name);
                }
            );
        },
    });

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: renderTemplate(template),

        // AMD module loading: adapter, basemap, plugin
        _midDeferred: undefined,

        _itemStoreDeferred: undefined,
        _mapDeferred: undefined,
        _mapExtentDeferred: undefined,
        _layersDeferred: undefined,
        _postCreateDeferred: undefined,
        _startupDeferred: undefined,

        // Permalink params
        _urlParams: undefined,

        // Current basemap
        _baseLayer: undefined,

        // For image loading
        assetUrl: ngwConfig.assetUrl,

        modeURLParam: "panel",
        emptyModeURLValue: "none",

        webmapStore: undefined,

        constructor: function (options) {
            declare.safeMixin(this, options);

            this._urlParams = URL.getURLParams();

            this._itemStoreDeferred = new LoggedDeferred("_itemStoreDeferred");
            this._mapDeferred = new LoggedDeferred("_mapDeferred");
            this._mapExtentDeferred = new LoggedDeferred("_mapExtentDeferred");
            this._layersDeferred = new LoggedDeferred("_layersDeferred");
            this._postCreateDeferred = new LoggedDeferred(
                "_postCreateDeferred"
            );
            this._startupDeferred = new LoggedDeferred("_startupDeferred");

            var widget = this;

            // AMD module loading
            this._midDeferred = {};
            this._mid = {};
            var mids = this.config.mid;

            this.clientSettings = settings;

            const activePanelKey = this._urlParams[this.modeURLParam];
            const onChangePanel = (panel) => {
                if (panel) {
                    URL.setURLParam(this.modeURLParam, panel.name);
                } else {
                    URL.setURLParam(this.modeURLParam, this.emptyModeURLValue);
                }
            };
            this.panelsManager = new PanelsManager.default(
                this,
                activePanelKey,
                onChangePanel
            );
            this._buildPanels();

            this.tabContainer = new ReactWebMapTabs({ display: this });

            // Add basemap's AMD modules
            mids.basemap.push(
                "ngw-webmap/ol/layer/OSM",
                "ngw-webmap/ol/layer/XYZ",
                "ngw-webmap/ol/layer/QuadKey"
            );

            array.forEach(
                Object.keys(mids),
                function (k) {
                    var deferred = new LoggedDeferred("_midDeferred." + k);
                    this._midDeferred[k] = deferred;

                    var midarr = mids[k];
                    require(midarr, function () {
                        var obj = {};
                        var i;
                        for (i = 0; i < arguments.length; i++) {
                            obj[midarr[i]] = arguments[i];
                        }

                        widget._mid[k] = obj;

                        deferred.resolve(obj);
                    });
                },
                this
            );

            // Map plugins
            var wmpmids = Object.keys(this.config.webmapPlugin);
            var deferred = new LoggedDeferred("_midDeferred.webmapPlugin");

            this._midDeferred.webmapPlugin = deferred;
            require(wmpmids, function () {
                var obj = {};
                for (var i = 0; i < arguments.length; i++) {
                    obj[wmpmids[i]] = arguments[i];
                }

                widget._mid.wmplugin = obj;

                deferred.resolve(obj);
            });

            this._itemStoreSetup();
            this._webmapStoreSetup();

            this._mapDeferred.then(function () {
                widget._itemStorePrepare();
            });

            this.displayProjection = "EPSG:3857";
            this.lonlatProjection = "EPSG:4326";

            if (this.config.extent[3] > 82) {
                this.config.extent[3] = 82;
            }
            if (this.config.extent[1] < -82) {
                this.config.extent[1] = -82;
            }

            this._extent = ol.proj.transformExtent(
                this.config.extent,
                this.lonlatProjection,
                this.displayProjection
            );

            this._extent_const = ol.proj.transformExtent(
                this.config.extent_const,
                this.lonlatProjection,
                this.displayProjection
            );

            // Layers panel
            widget._layersPanelSetup();

            // Map and plugins
            all([
                this._midDeferred.basemap,
                this._midDeferred.webmapPlugin,
                this._startupDeferred,
            ])
                .then(function () {
                    widget._pluginsSetup(true);
                    widget._mapSetup();
                })
                .then(undefined, function (err) {
                    console.error(err);
                });

            // Setup layers
            all([this._midDeferred.adapter, this._itemStoreDeferred])
                .then(function () {
                    widget._layersSetup();
                })
                .then(undefined, function (err) {
                    console.error(err);
                });

            all([this._layersDeferred, this._mapSetup])
                .then(
                    lang.hitch(this, function () {
                        widget._mapAddLayers();
                        widget.featureHighlighter = new FeatureHighlighter(
                            this.map
                        );
                    })
                )
                .then(undefined, function (err) {
                    console.error(err);
                });

            // Tools and plugins
            all([this._midDeferred.plugin, this._layersDeferred])
                .then(function () {
                    widget._toolsSetup();
                    widget._pluginsSetup();
                    widget._buildLayersTree();
                    widget._identifyFeatureByAttrValue();
                })
                .then(undefined, function (err) {
                    console.error(err);
                });

            this.tools = [];
        },

        postCreate: function () {
            this.inherited(arguments);

            this.leftPanelPane = new ContentPane({
                class: "leftPanelPane",
                region: "left",
                gutters: false,
                splitter: true,
            });

            const domElements = {
                main: this.mainContainer,
                leftPanel: this.leftPanelPane,
                navigation: this.navigationMenuPane.domNode,
            };
            this.panelsManager.initDomElements(domElements);

            this._postCreateDeferred.resolve();
        },

        startup: function () {
            this.inherited(arguments);
            this._startupDeferred.resolve();
        },

        prepareItem: function (item) {
            var self = this;
            var copy = {
                id: item.id,
                type: item.type,
                label: item.label,
            };

            if (copy.type === "layer") {
                copy.layerId = item.layerId;
                copy.styleId = item.styleId;

                copy.visibility = null;
                copy.checked = item.visibility;
                copy.identifiable = item.identifiable;
                copy.position = item.drawOrderPosition;
            } else if (copy.type === "group" || copy.type === "root") {
                copy.children = array.map(item.children, function (c) {
                    return self.prepareItem(c);
                });
            }
            this._itemConfigById[item.id] = item;

            return copy;
        },

        _webmapStoreSetup: function () {
            this.webmapStore = new WebmapStore.default({
                itemStore: this.itemStore,
            });
        },

        _itemStoreSetup: function () {
            this._itemConfigById = {};
            var rootItem = this.prepareItem(this.config.rootItem);

            this.itemStore = new CustomItemFileWriteStore({
                data: {
                    identifier: "id",
                    label: "label",
                    items: [rootItem],
                },
            });
        },

        _itemStorePrepare: function () {
            var widget = this;

            this.itemStore.fetch({
                queryOptions: { deep: true },
                onItem: function (item) {
                    widget._itemStorePrepareItem(item);
                },
                onComplete: function () {
                    widget._itemStoreDeferred.resolve();
                },
                onError: function () {
                    widget._itemStoreDeferred.reject();
                },
            });
        },

        _itemStorePrepareItem: function (item) {
            this._itemStoreVisibility(item);
        },

        _itemStoreVisibility: function (item) {
            var webmapStore = this.webmapStore;

            if (webmapStore) {
                webmapStore._itemStoreVisibility(item);
            }
        },

        _mapSetup: function () {
            var widget = this;

            widget.mapToolbar = new MapToolbar({
                display: widget,
                target: widget.leftBottomControlPane,
            });

            this.map = new Map({
                target: this.mapNode,
                logo: false,
                controls: [],
                view: new ol.View({
                    minZoom: 3,
                    constrainResolution: true,
                    extent: !this.config.extent_const.includes(null)
                        ? this._extent_const
                        : undefined,
                }),
            });

            this._mapAddControls([
                new ol.control.Zoom({
                    zoomInLabel: domConstruct.create("span", {
                        class: "ol-control__icon",
                        innerHTML: icon.html({ glyph: "add" }),
                    }),
                    zoomOutLabel: domConstruct.create("span", {
                        class: "ol-control__icon",
                        innerHTML: icon.html({ glyph: "remove" }),
                    }),
                    zoomInTipLabel: gettext("Zoom in"),
                    zoomOutTipLabel: gettext("Zoom out"),
                    target: widget.leftTopControlPane,
                }),
                new ol.control.Attribution({
                    tipLabel: gettext("Attributions"),
                    target: widget.rightBottomControlPane,
                    collapsible: false,
                }),
                new ol.control.ScaleLine({
                    target: widget.rightBottomControlPane,
                    units: settings.units,
                    minWidth: 48,
                }),
                new InfoScale({
                    display: widget,
                    target: widget.rightBottomControlPane,
                }),
                new InitialExtent({
                    display: widget,
                    target: widget.leftTopControlPane,
                    tipLabel: gettext("Initial extent"),
                }),
                new MyLocation({
                    display: widget,
                    target: widget.leftTopControlPane,
                    tipLabel: gettext("Locate me"),
                }),
                new ol.control.Rotate({
                    tipLabel: gettext("Reset rotation"),
                    target: widget.leftTopControlPane,
                    label: domConstruct.create("span", {
                        class: "ol-control__icon",
                        innerHTML: icon.html({ glyph: "arrow_upward" }),
                    }),
                }),
                widget.mapToolbar,
            ]);

            // Resize OpenLayers Map on container resize
            aspect.after(this.mapPane, "resize", function () {
                widget.map.olMap.updateSize();
            });

            // Basemaps initialization
            var idx = 0;
            array.forEach(
                settings.basemaps,
                function (bm) {
                    var MID = this._mid.basemap[bm.base.mid];

                    var baseOptions = lang.clone(bm.base);
                    var layerOptions = lang.clone(bm.layer);
                    var sourceOptions = lang.clone(bm.source);

                    if (baseOptions.keyname === undefined) {
                        baseOptions.keyname = "basemap_" + idx;
                    }

                    try {
                        var layer = new MID(
                            baseOptions.keyname,
                            layerOptions,
                            sourceOptions
                        );
                        if (layer.olLayer.getVisible()) {
                            this._baseLayer = layer;
                        }
                        layer.isBaseLayer = true;
                        this.map.addLayer(layer);
                    } catch (err) {
                        console.warn(
                            "Can't initialize layer [" +
                                baseOptions.keyname +
                                "]: " +
                                err
                        );
                    }

                    idx = idx + 1;
                },
                this
            );

            companyLogo.appendTo(this.mapNode);
            this._mapDeferred.resolve();
        },

        _mapAddControls: function (controls) {
            array.forEach(
                controls,
                function (control) {
                    this.map.olMap.addControl(control);
                },
                this
            );
        },
        _mapAddLayer: function (id) {
            this.map.addLayer(this.webmapStore._layers[id]);
        },
        _mapAddLayers: function () {
            array.forEach(
                this._layer_order,
                function (id) {
                    this._mapAddLayer(id);
                },
                this
            );
        },

        _adaptersSetup: function () {
            this._adapters = {};
            array.forEach(
                Object.keys(this._mid.adapter),
                function (k) {
                    this._adapters[k] = new this._mid.adapter[k]({
                        display: this,
                    });
                },
                this
            );
        },

        _onNewStoreItem: function (item) {
            var widget = this,
                store = this.itemStore;
            widget._layerSetup(item);
            widget._layer_order.unshift(store.getValue(item, "id"));
        },

        _layersSetup: function () {
            var widget = this,
                store = this.itemStore,
                visibleStyles = null;

            this._adaptersSetup();

            // Layer index by id
            /** @deprecated use this.webmapStore._layers instead. Fore backward compatibility */
            Object.defineProperty(this, "_layers", {
                get: function () {
                    return this.webmapStore._layers;
                },
            });
            this._layer_order = []; // Layers from back to front

            if (lang.isString(widget._urlParams.styles)) {
                visibleStyles = widget._urlParams.styles.split(",");
                visibleStyles = array.map(visibleStyles, function (i) {
                    return parseInt(i, 10);
                });
            }

            // Layers initialization
            store.fetch({
                query: { type: "layer" },
                queryOptions: { deep: true },
                sort: widget.config.drawOrderEnabled
                    ? [
                          {
                              attribute: "position",
                          },
                      ]
                    : null,
                onItem: function (item) {
                    widget._onNewStoreItem(item, visibleStyles);

                    // Turn on layers from permalink
                    var cond,
                        layer =
                            widget.webmapStore._layers[
                                store.getValue(item, "id")
                            ];
                    if (visibleStyles) {
                        cond =
                            array.indexOf(
                                visibleStyles,
                                store.getValue(item, "styleId")
                            ) !== -1;
                        layer.olLayer.setVisible(cond);
                        layer.visibility = cond;
                        store.setValue(item, "checked", cond);
                    }
                },
                onComplete: function () {
                    widget._layersDeferred.resolve();
                },
                onError: function (error) {
                    console.error(error);
                    widget._layersDeferred.reject();
                },
            });
        },

        _layerSetup: function (item) {
            var store = this.itemStore;

            var data = this._itemConfigById[store.getValue(item, "id")];
            var adapter = this._adapters[data.adapter];

            data.minResolution = this.map.getResolutionForScale(
                data.maxScaleDenom,
                this.map.olMap.getView().getProjection().getMetersPerUnit()
            );
            data.maxResolution = this.map.getResolutionForScale(
                data.minScaleDenom,
                this.map.olMap.getView().getProjection().getMetersPerUnit()
            );

            var layer = adapter.createLayer(data);

            layer.itemId = data.id;
            layer.itemConfig = data;

            this.webmapStore._layers[data.id] = layer;
        },

        _toolsSetup: function () {
            this.mapToolbar.items.addTool(
                new ToolZoom({ display: this, out: false }),
                "zoomingIn"
            );
            this.mapToolbar.items.addTool(
                new ToolZoom({ display: this, out: true }),
                "zoomingOut"
            );

            this.mapToolbar.items.addTool(
                new ToolMeasure({ display: this, type: "LineString" }),
                "measuringLength"
            );
            this.mapToolbar.items.addTool(
                new ToolMeasure({ display: this, type: "Polygon" }),
                "measuringArea"
            );

            this.mapToolbar.items.addTool(
                new ToolSwipe({ display: this, orientation: "vertical" }),
                "swipeVertical"
            );

            this.mapToolbar.items.addTool(
                new ToolViewerInfo({ display: this }),
                "~viewerInfo"
            );

            this.identify = new Identify({ display: this });
            var mapStates = MapStatesObserver.getInstance();
            mapStates.addState("identifying", this.identify);
            mapStates.setDefaultState("identifying", true);

            topic.publish("/webmap/tools/initialized");
        },

        _pluginsPanels: [],
        _pluginsSetup: function (wmplugin) {
            if (!this._plugins) {
                this._plugins = {};
            }

            var plugins = wmplugin ? this._mid.wmplugin : this._mid.plugin;
            this._installPlugins(plugins);
        },

        _installPlugins: function (plugins) {
            var widget = this;

            array.forEach(
                Object.keys(plugins),
                function (key) {
                    console.log("Plugin [%s]::constructor...", key);

                    var plugin = new plugins[key]({
                        identity: key,
                        display: this,
                        itemStore: plugins ? false : this.itemStore,
                    });

                    widget._postCreateDeferred.then(function () {
                        console.log("Plugin [%s]::postCreate...", key);
                        plugin.postCreate();

                        widget._startupDeferred.then(function () {
                            console.log("Plugin [%s]::startup...", key);
                            plugin.startup();

                            widget._plugins[key] = plugin;
                            console.info("Plugin [%s] registered", key);
                        });
                    });
                },
                this
            );
        },

        _layersPanelSetup: function () {
            var widget = this;

            all([
                this._layersDeferred,
                this._mapDeferred,
                this._postCreateDeferred,
                this.panelsManager.panelsReady.promise,
            ])
                .then(function () {
                    if (widget._urlParams.base) {
                        widget._switchBasemap(widget._urlParams.base);
                    }
                    widget._setMapExtent();
                    widget._mapExtentDeferred.resolve();
                })
                .then(undefined, function (err) {
                    console.error(err);
                });
        },

        _switchBasemap: function (basemapLayerKey) {
            if (!(basemapLayerKey in this.map.layers)) {
                return false;
            }

            if (this._baseLayer && this._baseLayer.name) {
                const { name } = this._baseLayer;
                this.map.layers[name].olLayer.setVisible(false);
            }

            const newLayer = this.map.layers[basemapLayerKey];
            newLayer.olLayer.setVisible(true);
            this._baseLayer = newLayer;

            return true;
        },

        _getActiveBasemapKey: function () {
            if (!this._baseLayer || !this._baseLayer.name) {
                return undefined;
            }
            return this._baseLayer.name;
        },

        _buildLayersTree: function () {
            const { expanded } = this.config.itemsStates;
            this.webmapStore.setWebmapItems(this.config.rootItem.children);
            this.webmapStore.setExpanded(expanded);
        },

        handleSelect: function (selectedKeys) {
            if (selectedKeys.length === 0 || selectedKeys.length < 1) {
                return;
            }
            const itemId = selectedKeys[0];
            this.itemStore.fetchItemByIdentity({
                identity: itemId,
                onItem: (item) => {
                    this.set("itemConfig", this._itemConfigById[itemId]);
                    this.set("item", item);
                },
            });
        },

        setLayerZIndex: function (id, zIndex) {
            const layer = this.map.layers[id];
            if (layer && layer.olLayer && layer.olLayer.setZIndex) {
                layer.olLayer.setZIndex(zIndex);
            }
        },

        getVisibleItems: function () {
            var store = this.itemStore,
                deferred = new Deferred();

            store.fetch({
                query: { type: "layer", visibility: "true" },
                sort: { attribute: "position" },
                queryOptions: { deep: true },
                onComplete: function (items) {
                    deferred.resolve(items);
                },
                onError: function (error) {
                    deferred.reject(error);
                },
            });

            return deferred;
        },

        dumpItem: function () {
            return this.itemStore.dumpItem(this.item);
        },

        _setMapExtent: function () {
            if (this._zoomByUrlParams()) return;
            this._zoomToInitialExtent();
        },

        _zoomByUrlParams: function () {
            const urlParams = this._urlParams;

            if (
                !(
                    "zoom" in urlParams &&
                    "lon" in urlParams &&
                    "lat" in urlParams
                )
            ) {
                return false;
            }

            this.map.olMap
                .getView()
                .setCenter(
                    ol.proj.fromLonLat([
                        parseFloat(urlParams.lon),
                        parseFloat(urlParams.lat),
                    ])
                );
            this.map.olMap.getView().setZoom(parseInt(urlParams.zoom));

            if ("angle" in urlParams) {
                this.map.olMap
                    .getView()
                    .setRotation(parseFloat(urlParams.angle));
            }

            return true;
        },

        _zoomToInitialExtent: function () {
            this.map.olMap.getView().fit(this._extent);
        },

        _identifyFeatureByAttrValue: function () {
            const urlParams = this._urlParams;

            if (
                !(
                    "hl_lid" in urlParams &&
                    "hl_attr" in urlParams &&
                    "hl_val" in urlParams
                )
            ) {
                return;
            }

            this.identify
                .identifyFeatureByAttrValue(
                    urlParams.hl_lid,
                    urlParams.hl_attr,
                    urlParams.hl_val
                )
                .then((result) => {
                    if (result) return;
                    errorModule.errorModal({
                        title: gettext("Object not found"),
                        message: gettext(
                            "Object from URL parameters not found"
                        ),
                    });
                });
        },

        _buildPanels: function () {
            const promises = all([
                this._layersDeferred,
                this._postCreateDeferred,
            ]);

            promises
                .then(lang.hitch(this, this._makePanels))
                .then(undefined, (err) => {
                    console.error(err);
                });
        },

        _makePanels: function () {
            const panels = [];

            panels.push({
                cls: reactPanel(LayersPanelModule.default, {
                    waitFor: [this.panelsManager.panelsReady.promise],
                }),
                params: {
                    title: gettext("Layers"),
                    name: "layers",
                    order: 10,
                    menuIcon: "material-layers",
                },
            });

            panels.push({
                cls: reactPanel("@nextgisweb/webmap/panel/search"),
                params: {
                    title: gettext("Search"),
                    name: "search",
                    order: 20,
                    menuIcon: "material-search",
                },
            });

            panels.push({
                cls: PrintMapPanel,
                params: {
                    title: gettext("Print map"),
                    name: "print",
                    order: 70,
                    menuIcon: "material-print",
                    splitter: false,
                },
            });

            const makeBookmarkPanel = new Promise((resolve) => {
                if (!this.config.bookmarkLayerId) {
                    resolve(undefined);
                }
                const panel = {
                    cls: reactPanel("@nextgisweb/webmap/panel/bookmarks"),
                    params: {
                        title: gettext("Bookmarks"),
                        name: "bookmark",
                        order: 50,
                        menuIcon: "material-bookmark",
                    },
                };
                resolve(panel);
            });
            panels.push(makeBookmarkPanel);

            const makeInfoPanel = new Promise((resolve) => {
                if (!this.config.webmapDescription) {
                    resolve(undefined);
                }
                const panel = {
                    cls: reactPanel("@nextgisweb/webmap/panel/description"),
                    params: {
                        title: gettext("Description"),
                        name: "info",
                        order: 40,
                        menuIcon: "material-info-outline",
                        class: "info-panel dynamic-panel--fullwidth",
                        withTitle: false,
                    },
                };
                resolve(panel);
            });
            panels.push(makeInfoPanel);

            const makeAnnotationsPanel = new Promise((resolve) => {
                this._buildAnnotationPanel(resolve);
            });
            panels.push(makeAnnotationsPanel);

            panels.push({
                cls: reactPanel("@nextgisweb/webmap/panel/share"),
                params: {
                    title: gettext("Share"),
                    name: "share",
                    order: 60,
                    menuIcon: "material-share",
                },
            });

            this.panelsManager.addPanels(panels);
            this.panelsManager.initFinalize();
        },

        _buildAnnotationPanel: function (resolve) {
            const shouldMakePanel =
                this.config.annotations &&
                this.config.annotations.enabled &&
                this.config.annotations.scope.read;

            if (!shouldMakePanel) {
                resolve(undefined);
                return;
            }

            const annotUrlParam = this._urlParams.annot;
            const allowedUrlValues = ["no", "yes", "messages"];
            let initialAnnotVisible;
            if (annotUrlParam && allowedUrlValues.includes(annotUrlParam)) {
                initialAnnotVisible = annotUrlParam;
            }
            initialAnnotVisible =
                initialAnnotVisible || this.config.annotations.default;
            AnnotationsStore.default.setVisibleMode(initialAnnotVisible);

            require(["ngw-webmap/ui/AnnotationsManager/AnnotationsManager"], (
                AnnotationsManager
            ) => {
                AnnotationsManager.getInstance({
                    display: this,
                    initialAnnotVisible,
                });
            });

            const panel = {
                cls: reactPanel("@nextgisweb/webmap/panel/annotations", {
                    props: {
                        onTopicPublish: (args) => {
                            topic.publish.apply(this, args);
                        },
                        mapStates: MapStatesObserver.getInstance(),
                        initialAnnotVisible,
                    },
                }),
                params: {
                    title: gettext("Annotations"),
                    name: "annotation",
                    order: 30,
                    menuIcon: "material-message",
                    class: "info-panel dynamic-panel--fullwidth",
                    withTitle: false,
                },
            };
            resolve(panel);
        },

        highlightGeometry: function (geometry) {
            this.map.zoomToFeature(new ol.Feature({ geometry }));
            topic.publish("feature.highlight", {
                olGeometry: geometry,
            });
        },
    });
});
