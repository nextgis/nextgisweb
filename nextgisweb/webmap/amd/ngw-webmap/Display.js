/* global console, ngwConfig */
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./template/Display.hbs",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/number",
    "dojo/aspect",
    "dojo/io-query",
    "openlayers/ol",
    "ngw/openlayers/Map",
    "ngw/openlayers/layer/Vector",
    "dijit/registry",
    "dijit/form/DropDownButton",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/layout/ContentPane",
    "dijit/form/ToggleButton",
    "dijit/Dialog",
    "dijit/form/TextBox",
    "dojo/dom-style",
    "dojo/request/xhr",
    "dojo/data/ItemFileWriteStore",
    "dojo/topic",
    "cbtree/models/TreeStoreModel",
    "cbtree/Tree",
    "ngw/route",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    // tools
    "ngw-webmap/MapToolbar",
    "./tool/Base",
    "./tool/Zoom",
    "./tool/Measure",
    "./ui/PrintButton/PrintButton",
    // settings
    "ngw/settings!webmap",
    // template
    "dijit/layout/TabContainer",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojox/layout/TableContainer",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/form/Select",
    "dijit/form/DropDownButton",
    "dijit/ToolbarSeparator",
    "ngw-webmap/ui/NgwShareButtons/NgwShareButtons",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + "cbtree/themes/claro/claro.css",
    "xstyle/css!" + ngwConfig.amdUrl + "openlayers/ol.css",
    "xstyle/css!./template/resources/Display.css"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    lang,
    array,
    Deferred,
    all,
    number,
    aspect,
    ioQuery,
    ol,
    Map,
    Vector,
    registry,
    DropDownButton,
    DropDownMenu,
    MenuItem,
    ContentPane,
    ToggleButton,
    Dialog,
    TextBox,
    domStyle,
    xhr,
    ItemFileWriteStore,
    topic,
    TreeStoreModel,
    Tree,
    route,
    i18n,
    hbsI18n,
    MapToolbar,
    ToolBase,
    ToolZoom,
    ToolMeasure,
    PrintButton,
    clientSettings
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
                                        obj[attributes[i]].push(this.dumpItem(value));
                                    } else {
                                        obj[attributes[i]].push(value);
                                    }
                                }
                            } else {
                                if (this.isItem(values[0])) {
                                    obj[attributes[i]] = this.dumpItem(values[0]);
                                } else {
                                    obj[attributes[i]] = values[0];
                                }
                            }
                        }
                    }
                }
            }

            return obj;
        }
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
        }
    });

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),

        // Load modules: adapter, basemap, plugin
        _midDeferred: undefined,

        // Initialize webmap's elements storage
        _itemStoreDeferred: undefined,

        // Map widget with base layers is created
        _mapDeferred: undefined,

        // Layers for map elements are created
        _layersDeferred: undefined,

        // Call after postCreate
        _postCreateDeferred: undefined,

        // Call after startup
        _startupDeferred: undefined,

        // GET-parameters: basemap, layers, center, resolution
        _urlParams: undefined,

        // Current basemap
        _baseLayer: undefined,

        // To load an image
        assetUrl: ngwConfig.assetUrl,

        constructor: function (options) {
            declare.safeMixin(this, options);

            // Extract GET-parameters from URL
            this._urlParams = (function(){
                var url, query, queryObject;
                url = window.location.toString();
                if (url.indexOf("?") !== -1) {
                    query = url.substring(url.indexOf("?") + 1, url.length);
                    queryObject = ioQuery.queryToObject(query);
                    if (lang.isString(queryObject.styles)) {
                        queryObject.styles = queryObject.styles.split(",");
                        queryObject.styles = array.map(queryObject.styles, function(i){ return parseInt(i, 10); });
                    }
                    return queryObject;
                }
                return {};
            })();

            this._itemStoreDeferred = new LoggedDeferred("_itemStoreDeferred");
            this._mapDeferred = new LoggedDeferred("_mapDeferred");
            this._layersDeferred = new LoggedDeferred("_layersDeferred");
            this._postCreateDeferred = new LoggedDeferred("_postCreateDeferred");
            this._startupDeferred = new LoggedDeferred("_startupDeferred");

            var widget = this;

            // Asynchronous loading of necessary modules
            this._midDeferred = {};
            this._mid = {};
            var mids = this.config.mid;

            // Access to settings
            this.clientSettings = clientSettings;

            // Add base maps MID
            array.forEach(clientSettings.basemaps, function (bm) {
                mids.basemap.push(bm.base.mid);
            });

            array.forEach(Object.keys(mids), function (k) {
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
            }, this);

            // Webmap level plugins
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

            // Storage
            this._itemStoreSetup();

            this._mapDeferred.then(
                function () { widget._itemStorePrepare(); }
            );

            // Model
            this.itemModel = new TreeStoreModel({
                store: this.itemStore,
                checkedAttr: "checked",
                query: { type: "root" }
            });

            this.displayProjection = "EPSG:3857";
            this.lonlatProjection = "EPSG:4326";

            if (this.config.extent[3] > 82) { this.config.extent[3] = 82; }
            if (this.config.extent[1] < -82) { this.config.extent[1] = -82; }

            this._extent = ol.proj.transformExtent(
                this.config.extent,
                this.lonlatProjection,
                this.displayProjection
            );

            // Layer elements tree
            this.itemTree = new Tree({
                style: "height: 100%",
                model: this.itemModel,
                autoExpand: true,
                showRoot: false
            });

            // Place a tree when widget is ready
            all([this._layersDeferred, this._postCreateDeferred]).then(
                function () { widget.itemTree.placeAt(widget.layerTreePane); }
            ).then(undefined, function (err) { console.error(err); });

            // Load bookmarks when button is ready
            this._postCreateDeferred.then(
                function () {
                    widget.mapToolbar.items.loadBookmarks();
                }
            ).then(undefined, function (err) { console.error(err); });

            // Chosen element
            this.itemTree.watch("selectedItem", function (attr, oldVal, newVal) {
                widget.set(
                    "itemConfig",
                    widget._itemConfigById[widget.itemStore.getValue(newVal, "id")]
                );
                widget.set("item", newVal);
            });

            // Map
            all([this._midDeferred.basemap, this._midDeferred.webmapPlugin, this._startupDeferred]).then(
                function () {
                    // If needed in the future, webmap level plugins
                    // can have a property for
                    // when the plugin code should be executed
                    // before map setting or after. Currently webmap level
                    // plugins are executed before map setting.
                    widget._pluginsSetup(true);
                    widget._mapSetup();
                }
            ).then(undefined, function (err) { console.error(err); });

            all([this._mapDeferred, this._postCreateDeferred]).then(
                function () {
                    // Create a list of base layers in a list
                    array.forEach(Object.keys(widget.map.layers), function (key) {
                        var layer = widget.map.layers[key];
                        if (layer.isBaseLayer) {
                            widget.basemapSelect.addOption({
                                value: key,
                                label: layer.title
                            });
                        }
                    });

                    // and add switching
                    widget.basemapSelect.watch("value", function (attr, oldVal, newVal) {
                        widget.map.layers[oldVal].olLayer.setVisible(false);
                        widget.map.layers[newVal].olLayer.setVisible(true);
                        widget._baseLayer = widget.map.layers[newVal];
                    });
                    if (widget._urlParams.base) { widget.basemapSelect.set("value", widget._urlParams.base); }
                }
            ).then(undefined, function (err) { console.error(err); });

            // Element layers
            all([this._midDeferred.adapter, this._itemStoreDeferred]).then(
                function () {
                    widget._layersSetup();
                }
            ).then(undefined, function (err) { console.error(err); });

            all([this._layersDeferred, this._mapSetup]).then(
                function () {
                    // Add layers to map
                    widget._mapAddLayers();

                    widget._mapAddHighlightOverlay();

                    // Link checkbox with layer visibility
                    var store = widget.itemStore;
                    store.on("Set", function (item, attr, oldVal, newVal) {
                        if (attr === "checked" && store.getValue(item, "type") === "layer") {
                            var id = store.getValue(item, "id");
                            var layer = widget._layers[id];
                            layer.set("visibility", newVal);
                        }
                    });
                }
            ).then(undefined, function (err) { console.error(err); });


            // Default tools and plugins
            all([this._midDeferred.plugin, this._layersDeferred]).then(
                function () {
                    widget._toolsSetup();
                    widget._pluginsSetup();
                }
            ).then(undefined, function (err) { console.error(err); });

            // Fold tree elements that are not marked as unfolded.
            // By default all elements are unfolded with autoExpand у itemTree
            all([this._itemStoreDeferred, widget.itemTree.onLoadDeferred]).then(
                function () {
                    widget.itemStore.fetch({
                        queryOptions: { deep: true },
                        onItem: function (item) {
                            var node = widget.itemTree.getNodesByItem(item)[0],
                                config = widget._itemConfigById[widget.itemStore.getValue(item, "id")];
                            if (node && config.type === "group" && !config.expanded) {
                                node.collapse();
                            }
                        }
                    });
                }
            ).then(undefined, function (err) { console.error(err); });


            // Tools
            this.tools = [];
        },

        postCreate: function () {
            this.inherited(arguments);

            // Modify TabContainer so that it shows tabs only if
            // there are more then 1, so don't show tabs if there is just one of them
            declare.safeMixin(this.tabContainer, {
                updateTabVisibility: function () {
                    var currstate = domStyle.get(this.tablist.domNode, "display") != "none",
                        newstate = this.getChildren().length > 1;

                    if (currstate && !newstate) {
                        // Hide tabs panel
                        domStyle.set(this.tablist.domNode, "display", "none");
                        this.resize();
                    } else if (!currstate && newstate) {
                        // Show tabs panel
                        domStyle.set(this.tablist.domNode, "display", "block");
                        this.resize();
                    }
                },

                addChild: function () {
                    this.inherited(arguments);
                    this.updateTabVisibility();
                },
                removeChild: function () {
                    this.inherited(arguments);
                    this.updateTabVisibility();
                },
                startup: function () {
                    this.inherited(arguments);
                    this.updateTabVisibility();
                }
            });

            this._postCreateDeferred.resolve();
        },

        startup: function () {
            this.inherited(arguments);

            this.itemTree.startup();

            this._startupDeferred.resolve();
        },

        _itemStoreSetup: function () {
            var itemConfigById = {};

            function prepare_item(item) {
                // Move to store only necessary stuff and stuff that
                // can change while working with the map.
                var copy = {
                    id: item.id,
                    type: item.type,
                    label: item.label
                };

                if (copy.type === "layer") {
                    copy.layerId = item.layerId;
                    copy.styleId = item.styleId;

                    copy.visibility = null;
                    copy.checked = item.visibility;

                } else if (copy.type === "group" || copy.type === "root") {
                    copy.children = array.map(item.children, function (c) { return prepare_item(c); });
                }

                // Build an index for everything else
                itemConfigById[item.id] = item;

                return copy;
            }

            var rootItem = prepare_item(this.config.rootItem);

            this.itemStore = new CustomItemFileWriteStore({data: {
                identifier: "id",
                label: "label",
                items: [ rootItem ]
            }});

            this._itemConfigById = itemConfigById;
        },

        _itemStorePrepare: function () {
            var widget = this;

            this.itemStore.fetch({
                queryOptions: { deep: true },
                onItem: function (item) {
                    widget._itemStorePrepareItem(item);
                },
                onComplete: function () {
                    widget.itemStore.on("Set", function (item, attr) {
                        // While attribute checked is changed
                        // watch changes in the list of visible layers
                        if (attr === "checked") { widget._itemStoreVisibility(item); }
                    });

                    widget._itemStoreDeferred.resolve();
                },
                onError: function () {
                    widget._itemStoreDeferred.reject();
                }
            });
        },

        _itemStorePrepareItem: function (item) {
            this._itemStoreVisibility(item);
        },

        _itemStoreVisibility: function (item) {
            var store = this.itemStore;

            if (store.getValue(item, "type") === "layer") {
                var newVal = store.getValue(item, "checked");
                if (store.getValue(item, "visibility") !== newVal) {
                    console.log("Layer [%s] visibility has changed to [%s]", store.getValue(item, "id"), newVal);
                    store.setValue(item, "visibility", newVal);
                }
            }
        },

        _mapSetup: function () {
            var widget = this;

            // Initialize webmap
            this.map = new Map({
                target: this.mapNode,
                logo: false,
                controls: [
                    new ol.control.Rotate({
                        tipLabel: i18n.gettext("Reset rotation")
                    }),
                    new ol.control.Zoom({
                        zoomInTipLabel: i18n.gettext("Zoom in"),
                        zoomOutTipLabel: i18n.gettext("Zoom out")
                    }),
                    new ol.control.Attribution({
                        tipLabel: i18n.gettext("Attributions")
                    }),
                    new ol.control.ScaleLine()
                ],
                view: new ol.View({
                    minZoom: 3
                })
            });

            // Update map center text
            this.map.watch("center", function (attr, oldVal, newVal) {
                var pt = ol.proj.transform(newVal, widget.displayProjection, widget.lonlatProjection);
                widget.mapToolbar.items.centerLonNode.innerHTML = number.format(pt[0], {places: 3});
                widget.mapToolbar.items.centerLatNode.innerHTML = number.format(pt[1], {places: 3});
            });

            // Update scale text
            this.map.watch("resolution", function (attr, oldVal, newVal) {
                widget.mapToolbar.items.scaleInfoNode.innerHTML = "1 : " + number.format(
                    widget.map.getScaleForResolution(
                        newVal,
                        widget.map.olMap.getView().getProjection().getMetersPerUnit()
                    ), {places: 0});
            });

            // If container size is changed recalculate map size
            aspect.after(this.mapPane, "resize", function() {
                widget.map.olMap.updateSize();
            });

            // Initialize basemaps
            var idx = 0;
            array.forEach(clientSettings.basemaps, function (bm) {
                var MID = this._mid.basemap[bm.base.mid];

                var baseOptions = lang.clone(bm.base);
                var layerOptions = lang.clone(bm.layer);
                var sourceOptions = lang.clone(bm.source);

                if (baseOptions.keyname === undefined) {
                    baseOptions.keyname = "basemap_" + idx;
                }

                try {
                    var layer = new MID(baseOptions.keyname, layerOptions, sourceOptions);
                    if (layer.olLayer.getVisible()) {
                        this._baseLayer = layer;
                    }
                    layer.isBaseLayer = true;
                    this.map.addLayer(layer);
                } catch (err) {
                    console.warn("Can't initialize layer [" + baseOptions.keyname + "]: " + err);
                }

                idx = idx + 1;
            }, this);

            this.mapToolbar.items.zoomToInitialExtentButton.on("click", function() {
                widget._zoomToInitialExtent();
            });

            this.mapToolbar.items.leftToolbarSwitch.on("change", lang.hitch(this, function (isLayersShow) {
                if (isLayersShow) {
                    this.mapToolbar.items.leftToolbarSwitch.set("title", i18n.gettext("Hide layers"));
                    this.mapToolbar.items.leftToolbarSwitch.set("iconClass", "iconSideHide");
                    this.mainContainer.addChild(this.leftPanel);
                }
                else {
                    this.mapToolbar.items.leftToolbarSwitch.set("title", i18n.gettext("Show layers"));
                    this.mapToolbar.items.leftToolbarSwitch.set("iconClass", "iconSideExpand");
                    this.mainContainer.removeChild(this.leftPanel);
                }
            }));

            this._zoomToInitialExtent();

            this._mapDeferred.resolve();
        },

        _mapAddLayers: function () {
            array.forEach(this._layer_order, function (id) {
                this.map.addLayer(this._layers[id]);
            }, this);
        },

        _mapAddHighlightOverlay: function () {
            var wkt = new ol.format.WKT(),
                overlay, source;

            topic.subscribe("feature.highlight", function (e) {
                source.clear();
                source.addFeature(new ol.Feature({
                    geometry: wkt.readGeometry(e.geom)
                }));
            });

            topic.subscribe("feature.unhighlight", function () {
                source.clear();
            });

            var stroke = new ol.style.Stroke({
                width: 3,
                color: "rgba(255,255,0,1)"
            });
            overlay = new Vector("highlight", {
                title: "Highlight Overlay",
                style: new ol.style.Style({
                    stroke: stroke,
                    image: new ol.style.Circle({
                        stroke: stroke,
                        radius: 5
                    })
                })
            });
            source = overlay.olLayer.getSource();
            this.map.addLayer(overlay);
        },

        _adaptersSetup: function () {
            // Create instances for all adapter classes
            this._adapters = {};
            array.forEach(Object.keys(this._mid.adapter), function (k) {
                this._adapters[k] = new this._mid.adapter[k]({
                    display: this
                });
            }, this);
        },

        _layersSetup: function () {
            var widget = this, store = this.itemStore;

            this._adaptersSetup();

            this._layers = {};              // List all layers by id
            this._layer_order = [];         // Layers order from bottom to top

            // Initialize layers
            store.fetch({
                query: {type: "layer"},
                queryOptions: {deep: true},
                onItem: function (item) {
                    widget._layerSetup(item);
                    widget._layer_order.unshift(store.getValue(item, "id"));

                    // Turn on layers from URL
                    var cond,
                        layer = widget._layers[store.getValue(item, "id")],
                        visibleStyles = widget._urlParams.styles;
                    if (visibleStyles) {
                        cond = array.indexOf(visibleStyles, store.getValue(item, "styleId")) !== -1;
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
                }
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

            this._layers[data.id] = layer;
        },

        _toolsSetup: function () {
            this.mapToolbar.items.addTool(new ToolZoom({display: this, out: false}), 'zoomingIn');
            this.mapToolbar.items.addTool(new ToolZoom({display: this, out: true}), 'zoomingOut');

            this.mapToolbar.items.addTool(new ToolMeasure({display: this, type: "LineString"}), 'measuringLength');
            this.mapToolbar.items.addTool(new ToolMeasure({display: this, type: "Polygon"}), 'measuringArea');

            this.mapToolbar.items.addSeparator();
            this.mapToolbar.items.addButton(PrintButton);
        },

        _pluginsSetup: function (wmplugin) {
            this._plugins = {};

            var widget = this,
                plugins = wmplugin ? this._mid.wmplugin
                                   : this._mid.plugin;

            array.forEach(Object.keys(plugins), function (key) {
                console.log("Plugin [%s]::constructor...", key);

                var plugin =  new plugins[key]({
                    identity: key,
                    display: this,
                    itemStore: wmplugin ? false : this.itemStore
                });

                widget._postCreateDeferred.then(
                    function () {
                        console.log("Plugin [%s]::postCreate...", key);
                        plugin.postCreate();

                        widget._startupDeferred.then(
                            function () {
                                console.log("Plugin [%s]::startup...", key);
                                plugin.startup();

                                widget._plugins[key] = plugin;
                                console.info("Plugin [%s] registered", key);
                            }
                        );
                    }
                );
            }, this);
        },

        getVisibleItems: function () {
            var store = this.itemStore,
                deferred = new Deferred();

            store.fetch({
                query: {type: "layer", visibility: "true"},
                queryOptions: {deep: true},
                onComplete: function (items) {
                    deferred.resolve(items);
                },
                onError: function (error) {
                    deferred.reject(error);
                }
            });

            return deferred;
        },

        dumpItem: function () {
            // Unload the value of selected layer from itemStore as an Object
            return this.itemStore.dumpItem(this.item);
        },

        _zoomToInitialExtent: function () {
            if (this._urlParams.zoom && this._urlParams.lon && this._urlParams.lat) {
                this.map.olMap.getView().setCenter(
                    ol.proj.fromLonLat([
                        parseFloat(this._urlParams.lon),
                        parseFloat(this._urlParams.lat)
                    ])
                );
                this.map.olMap.getView().setZoom(
                    parseInt(this._urlParams.zoom)
                );

                if (this._urlParams.angle) {
                    this.map.olMap.getView().setRotation(
                        parseFloat(this._urlParams.angle)
                    );
                }
            } else {
                this.map.olMap.getView().fit(this._extent);
            }
        }
    });
});
