define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/aspect",
    "dojo/topic",
    "dojo/data/ItemFileWriteStore",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "openlayers/ol",
    "@nextgisweb/gui/error",
    "@nextgisweb/pyramid/company-logo",
    "@nextgisweb/webmap/store",
    "@nextgisweb/webmap/panels-manager",
    "@nextgisweb/webmap/store/annotations",
    "./ol/Map",
    "./MapToolbar",
    "./FeatureHighlighter",
    "./MapStatesObserver",
    "./ui/react-panel",
    "./ui/react-webmap-tabs",
    // tools
    "@nextgisweb/webmap/map-controls",
    // Tiny display
    "ngw-webmap/controls/LinkToMainMap",
    // panels
    "@nextgisweb/webmap/panel/layers",
    // utils
    "./utils/URL",
    // settings
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/pyramid/settings!webmap",
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
    topic,
    ItemFileWriteStore,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ContentPane,
    ol,
    errorModule,
    companyLogo,
    WebmapStore,
    PanelsManager,
    AnnotationsStore,
    Map,
    MapToolbar,
    FeatureHighlighter,
    MapStatesObserver,
    reactPanel,
    ReactWebMapTabs,
    MapControls,
    LinkToMainMap,
    LayersPanelModule,
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
        tinyConfig: undefined,

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
            this.mapStates = MapStatesObserver.getInstance();

            // AMD module loading
            this._midDeferred = {};
            this._mid = {};
            var mids = this.config.mid;

            this.clientSettings = settings;

            this._buildPanelsManager();

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
                    widget._pluginsSetup();
                    widget._buildLayersTree();
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
            this._handleTinyDisplayMode();

            this._postCreateDeferred.resolve();
        },

        startup: function () {
            this.inherited(arguments);

            if (settings.hide_nav_menu && ngwConfig.isGuest) {
                const navMenu = document.querySelector("#header #menu");
                navMenu.style.display = "none";
            }

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

            const controlsReady = MapControls.buildControls(this);

            if (controlsReady.has("id")) {
                const { control } = controlsReady.get("id");
                this.identify = control;
                this.mapStates.addState("identifying", this.identify);
                this.mapStates.setDefaultState("identifying", true);
                widget._identifyFeatureByAttrValue();
            }

            topic.publish("/webmap/tools/initialized");

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
                        layer = widget.webmapStore.getLayer(
                            store.getValue(item, "id")
                        );
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

            this.webmapStore.addLayer(data.id, layer);
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

                    if (this.isTinyMode() && !this.isTinyModePlugin(key)) {
                        return;
                    }

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
                    urlParams.hl_val,
                    urlParams.zoom
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

        _handleTinyDisplayMode: function () {
            if (!this.isTinyMode()) {
                return;
            }

            this.domNode.classList.add("tiny");

            all([
                this._layersDeferred,
                this._mapDeferred,
                this._postCreateDeferred,
                this.panelsManager.panelsReady.promise,
            ])
                .then(() => {
                    this._buildTinyPanels();
                    this._addLinkToMainMap();
                    this._handlePostMessage();
                })
                .then(undefined, function (err) {
                    console.error(err);
                });
        },

        _buildTinyPanels: function () {
            if (!this.panelsManager.getPanelsCount()) {
                return;
            }

            this.domNode.classList.add("tiny-panels");
            const activePanel = this.panelsManager.getActivePanelName();
            if (!activePanel) {
                return;
            }
            this.panelsManager.deactivatePanel();
            this.panelsManager.activatePanel(activePanel);
        },

        _buildPanelsManager: function () {
            const activePanelKey = this._urlParams[this.modeURLParam];
            const onChangePanel = (panel) => {
                if (panel) {
                    URL.setURLParam(this.modeURLParam, panel.name);
                } else {
                    URL.setURLParam(this.modeURLParam, this.emptyModeURLValue);
                }
            };

            let allowPanels;
            if (this.isTinyMode()) {
                allowPanels = this._urlParams.panels
                    ? this._urlParams.panels.split(",")
                    : [];
            }

            this.panelsManager = new PanelsManager.default(
                this,
                activePanelKey,
                allowPanels,
                onChangePanel
            );

            this._buildPanels();
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
                    applyToTinyMap: true,
                },
            });

            panels.push({
                cls: reactPanel("@nextgisweb/webmap/panel/search"),
                params: {
                    title: gettext("Search"),
                    name: "search",
                    order: 20,
                    menuIcon: "material-search",
                    applyToTinyMap: true,
                },
            });

            panels.push({
                cls: reactPanel("@nextgisweb/webmap/panel/print"),
                params: {
                    title: gettext("Print map"),
                    name: "print",
                    order: 70,
                    menuIcon: "material-print",
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
                        applyToTinyMap: true,
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
                        applyToTinyMap: true,
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
                    applyToTinyMap: true,
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

        getUrlParams: function () {
            return this._urlParams;
        },

        isTinyMode: function () {
            return this.tinyConfig !== undefined;
        },

        isTinyModePlugin: function (pluginKey) {
            const disabledPlugins = [
                "ngw-webmap/plugin/LayerEditor",
                "ngw-webmap/plugin/FeatureLayer",
            ];
            return !disabledPlugins.includes(pluginKey);
        },

        _addLinkToMainMap: function () {
            if (this._urlParams.linkMainMap !== "true") {
                return;
            }
            this.map.olMap.addControl(
                new LinkToMainMap({
                    url: this.tinyConfig.mainDisplayUrl,
                    target: this.rightTopControlPane,
                    tipLabel: gettext("Open full map"),
                })
            );
        },

        /**
         * Generate window `message` events to listen from iframe
         * @example
         * window.addEventListener('message', function(evt) {
         *    var data = evt.data;
         *    if (data.event === 'ngMapExtentChanged') {
         *        if (data.detail === 'zoom') {
         *        } else if (data.detail === 'move') {
         *        }
         *        // OR
         *        if (data.detail === 'position') {}
         *    }
         * }, false);
         */
        _handlePostMessage: function () {
            var widget = this;
            var parent = window.parent;
            if (
                this._urlParams.events === "true" &&
                parent &&
                parent.postMessage
            ) {
                var commonOptions = {
                    event: "ngMapExtentChanged",
                };
                var parsePosition = function (pos) {
                    return {
                        zoom: pos.zoom,
                        lat: pos.center[1],
                        lon: pos.center[0],
                    };
                };
                widget.map.watch(
                    "position",
                    function (name, oldPosition, newPosition) {
                        oldPosition = oldPosition
                            ? parsePosition(oldPosition)
                            : {};
                        newPosition = parsePosition(newPosition);
                        // set array of position part to compare between old and new state
                        var events = [
                            { params: ["lat", "lon"], name: "move" },
                            { params: ["zoom"], name: "zoom" },
                        ];
                        var transformPosition = widget.map.getPosition(
                            widget.lonlatProjection
                        );
                        // prepare to send transform position
                        commonOptions.data = parsePosition(transformPosition);
                        array.forEach(events, function (event) {
                            var isChange = array.some(
                                event.params,
                                function (p) {
                                    return oldPosition[p] !== newPosition[p];
                                }
                            );
                            if (isChange) {
                                commonOptions.detail = event.name;
                                // message should be a string to work correctly with all browsers and systems
                                parent.postMessage(
                                    JSON.stringify(commonOptions),
                                    "*"
                                );
                            }
                        });
                        // on any position change
                        commonOptions.detail = name;
                        parent.postMessage(JSON.stringify(commonOptions), "*");
                    }
                );
            }
        },
    });
});
