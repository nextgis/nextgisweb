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
    "dojo/dom-construct",
    "dojo/dom-class",
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
    "ngw-webmap/controls/InitialExtent",
    "ngw-webmap/controls/InfoScale",
    "./tool/Base",
    "./tool/Zoom",
    "./tool/Measure",
    //left panel
    "ngw-pyramid/navigation-menu/NavigationMenu",
    "ngw-webmap/ui/LayersPanel/LayersPanel",
    "ngw-webmap/ui/PrintMapPanel/PrintMapPanel",
    "ngw-webmap/ui/SearchPanel/SearchPanel",
    "./tool/Swipe",
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
    domConstruct,
    domClass,
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
    InitialExtent, InfoScale, ToolBase, ToolZoom, ToolMeasure,
    NavigationMenu,
    LayersPanel, PrintMapPanel, SearchPanel,
    ToolSwipe,
    clientSettings,
    //template
    TabContainer, BorderContainer
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

        // Загрузка разных видов модулей: adapter, basemap, plugin
        _midDeferred: undefined,

        // Инициализация хранилища элементов веб-карты
        _itemStoreDeferred: undefined,

        // Виджет карты с базовыми слоями создан
        _mapDeferred: undefined,

        // Слои элементов карты созданы
        _layersDeferred: undefined,

        // Вызов после postCreate
        _postCreateDeferred: undefined,

        // Вызов после startup
        _startupDeferred: undefined,

        // GET-параметры: подложка, слои, центр, разрешение
        _urlParams: undefined,

        // Текущая подложка
        _baseLayer: undefined,

        // Для загрузки изображения
        assetUrl: ngwConfig.assetUrl,

        // Активная левая панель
        activeLeftPanel: 'layersPanel',

        constructor: function (options) {
            declare.safeMixin(this, options);

            // Извлекаем GET-параметры из URL
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

            // Асинхронная загрузка необходимых модулей
            this._midDeferred = {};
            this._mid = {};
            var mids = this.config.mid;

            // Доступ к настройкам
            this.clientSettings = clientSettings;

            // Добавляем MID базовых карт
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

            // Плагины уровня карты
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

            // Хранилище
            this._itemStoreSetup();

            this._mapDeferred.then(
                function () { widget._itemStorePrepare(); }
            );

            // Модель
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

            // Панель слоев
            widget._layersPanelSetup();

            // Панель печати
            all([widget._layersDeferred, widget._postCreateDeferred]).then(
                function () {
                    widget.printMapPanel = new PrintMapPanel({
                        region: 'left',
                        splitter: false,
                        title: i18n.gettext("Print map"),
                        isOpen: widget.activeLeftPanel == "printMapPanel",
                        class: "dynamic-panel--fullwidth",
                        gutters: false,
                        map: widget.map.olMap
                    });

                    if (widget.activeLeftPanel == "printMapPanel")
                        widget.activatePanel(widget.printMapPanel);

                    widget.printMapPanel.on("closed", function(){
                        widget.navigationMenu.reset();
                    });
                }
            ).then(undefined, function (err) { console.error(err); });

            // Панель поиска
            all([widget._layersDeferred, widget._postCreateDeferred]).then(
                function () {
                    widget.searchPanel = new SearchPanel({
                        region: 'left',
                        class: "dynamic-panel--fullwidth",
                        isOpen: widget.activeLeftPanel == "searchPanel",
                        gutters: false,
                        withCloser: false,
                        display: widget
                    });

                    if (widget.activeLeftPanel == "searchPanel")
                        widget.activatePanel(widget.searchPanel);

                    widget.searchPanel.on("closed", function(){
                        widget.navigationMenu.reset();
                    });
                }
            ).then(undefined, function (err) { console.error(err); });

            // Загружаем закладки, когда кнопка будет готова
            /*this._postCreateDeferred.then(
                function () {
                    tool widget.mapToolbar.items.loadBookmarks();
                    widget.mapToolbar = new MapToolbar({
                        region:'top',
                        display: widget
                    });
                }
            ).then(undefined, function (err) { console.error(err); });*/

            // Карта
            all([this._midDeferred.basemap, this._midDeferred.webmapPlugin, this._startupDeferred]).then(
                function () {
                    // Если в дальнейшем будет необходимо, то для плагинов
                    // уровня карты можно будет ввести какой-то признак
                    // того, когда следует исполнять код плагина:
                    // до настройки карты или после. Сейчас плагины
                    // уровня карты исполняются перед настройкой карты.
                    widget._pluginsSetup(true);
                    widget._mapSetup();
                }
            ).then(undefined, function (err) { console.error(err); });

            // Слои элементов
            all([this._midDeferred.adapter, this._itemStoreDeferred]).then(
                function () {
                    widget._layersSetup();
                }
            ).then(undefined, function (err) { console.error(err); });

            all([this._layersDeferred, this._mapSetup]).then(
                function () {
                    // Добавляем слои на карту
                    widget._mapAddLayers();

                    widget._mapAddHighlightOverlay();

                    // Связываем изменение чекбокса с видимостью слоя
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


            // Иструменты по-умолчанию и плагины
            all([this._midDeferred.plugin, this._layersDeferred]).then(
                function () {
                    widget._toolsSetup();
                    widget._pluginsSetup();
                }
            ).then(undefined, function (err) { console.error(err); });

            // Инструменты
            this.tools = [];
        },

        postCreate: function () {
            this.inherited(arguments);
            var widget = this;

            // Модифицируем TabContainer так, чтобы он показывал табы только
            // в том случае, если их больше одного, т.е. один таб не показываем
            declare.safeMixin(this.tabContainer, {
                updateTabVisibility: function () {
                    var currstate = domStyle.get(this.tablist.domNode, "display") != "none",
                        newstate = this.getChildren().length > 1;

                    if (currstate && !newstate) {
                        // Скрываем панель с табами
                        domStyle.set(this.tablist.domNode, "display", "none");
                        this.resize();
                    } else if (!currstate && newstate) {
                        // Показываем панель с табами
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

            // Левое меню
            this._navigationMenuSetup();

            // Контейнер для левой панели
            this.leftPanelPane = new BorderContainer({
                class: "leftPanelPane",
                region: "left",
                gutters: false,
                splitter: true
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
                // В хранилище переносим только самое необходимое и то, что
                // может меняться в процессе работы с картой.
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

                // Для всего остального строим индекс
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
                        // При изменении атрибута checked следим за изменениями
                        // в списке видимых слоев
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

            widget.mapToolbar = new MapToolbar({
                display: widget,
                target: widget.leftBottomControlPane
            });

            // Инициализация карты
            this.map = new Map({
                target: this.mapNode,
                logo: false,
                controls: [],
                view: new ol.View({
                    minZoom: 3
                })
            });

            this._mapAddControls([
                new ol.control.Zoom({
                    zoomInLabel: domConstruct.create("span", {
                        class: "ol-control__icon material-icons",
                        innerHTML: "add"
                    }),
                    zoomOutLabel: domConstruct.create("span", {
                        class: "ol-control__icon material-icons",
                        innerHTML: "remove"
                    }),
                    zoomInTipLabel: i18n.gettext("Zoom in"),
                    zoomOutTipLabel: i18n.gettext("Zoom out"),
                    target: widget.leftTopControlPane,
                }),
                new ol.control.Attribution({
                    tipLabel: i18n.gettext("Attributions"),
                    target: widget.rightBottomControlPane,
                    collapsible: false
                }),
                new ol.control.ScaleLine({
                    target: widget.rightBottomControlPane,
                    minWidth: 48
                }),
                new InfoScale({
                    display: widget,
                    target: widget.rightBottomControlPane
                }),
                new InitialExtent({
                    display: widget,
                    target: widget.leftTopControlPane,
                    tipLabel: i18n.gettext("Initial extent")
                }),
                new ol.control.Rotate({
                    tipLabel: i18n.gettext("Reset rotation"),
                    target: widget.leftTopControlPane,
                    label: domConstruct.create("span", {
                        class: "ol-control__icon material-icons",
                        innerHTML: "arrow_upward"
                    })
                }),
                widget.mapToolbar
            ]);

            // При изменении размеров контейнера пересчитываем размер карты
            aspect.after(this.mapPane, "resize", function() {
                widget.map.olMap.updateSize();
            });

            // Инициализация базовых слоев
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

            this._zoomToInitialExtent();

            this._mapDeferred.resolve();
        },

        _mapAddControls(controls){
            array.forEach(controls, function(control){
                this.map.olMap.addControl(control);
            }, this);
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
            // Создаем экземпляры всех классов адаптеров
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

            this._layers = {};              // Список всех слоев по id
            this._layer_order = [];         // Порядок слоев от нижнего к верхнему

            // Инициализация слоев
            store.fetch({
                query: {type: "layer"},
                queryOptions: {deep: true},
                onItem: function (item) {
                    widget._layerSetup(item);
                    widget._layer_order.unshift(store.getValue(item, "id"));

                    // Включаем слои, указанные в URL
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

            this.mapToolbar.items.addTool(new ToolSwipe({display: this, orientation: "vertical"}), 'swipeVertical');

            topic.publish('/webmap/tools/initialized');
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

        _navigationMenuSetup(){
            var widget = this;

            this.navigationMenu = new NavigationMenu({
                value: this.activeLeftPanel,
                items: [
                    {
                        name: 'layers',
                        icon: 'layers',
                        value: 'layersPanel'
                    },
                    {
                        name: 'search',
                        icon: 'search',
                        value: 'searchPanel'
                    },
                    {
                        name: 'print',
                        icon: 'print',
                        value: 'printMapPanel'
                    }
                ],
                region: 'left'
            }).placeAt(this.navigationMenuPane);

            this.navigationMenu.watch("value", function(name, oldValue, value){
                if (oldValue && widget[oldValue])
                    widget.deactivatePanel(widget[oldValue]);

                if (widget[value])
                    widget.activatePanel(widget[value]);

                widget.activeLeftPanel = value;
            });
        },

        _layersPanelSetup: function(){
            var widget = this;

            // Дерево элементов слоя
            widget.itemTree = new Tree({
                style: "height: 100%",
                model: widget.itemModel,
                autoExpand: true,
                showRoot: false
            });

            // Выбранный элемент
            widget.itemTree.watch("selectedItem", function (attr, oldVal, newVal) {
                widget.set(
                    "itemConfig",
                    widget._itemConfigById[widget.itemStore.getValue(newVal, "id")]
                );
                widget.set("item", newVal);
            });

            // Размещаем дерево, когда виджет будет готов
            all([widget._layersDeferred, widget._postCreateDeferred]).then(
                function () {
                    widget.layersPanel = new LayersPanel({
                        region: 'left',
                        class: "dynamic-panel--fullwidth",
                        title: i18n.gettext("Layers"),
                        isOpen: widget.activeLeftPanel == "layersPanel",
                        gutters: false,
                        withCloser: false
                    });

                    widget.itemTree.placeAt(widget.layersPanel.contentWidget.layerTreePane);

                    if (widget.activeLeftPanel == "layersPanel")
                        widget.activatePanel(widget.layersPanel);

                    widget.layersPanel.on("closed", function(){
                        widget.navigationMenu.reset();
                    });
                }
            ).then(undefined, function (err) { console.error(err); });

            // Свернем те элементы дерева, которые не отмечены как развернутые.
            // По-умолчанию все элементы развернуты за счет autoExpand у itemTree
            all([widget._itemStoreDeferred, widget.itemTree.onLoadDeferred]).then(
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

            all([this._layersDeferred, this._mapDeferred, this._postCreateDeferred]).then(
                function () {
                    // Формируем список слоев базовых карты в списке выбора
                    array.forEach(Object.keys(widget.map.layers), function (key) {
                        var layer = widget.map.layers[key];
                        if (layer.isBaseLayer) {
                            widget.layersPanel.contentWidget.basemapSelect.addOption({
                                value: key,
                                label: layer.title
                            });
                        }
                    });

                    // И добавляем возможность переключения
                    widget.layersPanel.contentWidget.basemapSelect.watch("value", function (attr, oldVal, newVal) {
                        widget.map.layers[oldVal].olLayer.setVisible(false);
                        widget.map.layers[newVal].olLayer.setVisible(true);
                        widget._baseLayer = widget.map.layers[newVal];
                    });
                    if (widget._urlParams.base) { widget.layersPanel.contentWidget.basemapSelect.set("value", widget._urlParams.base); }
                }
            ).then(undefined, function (err) { console.error(err); });
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
            // Выгружает значение выбранного слоя из itemStore в виде Object
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
        },
        activatePanel(panel){
            panel.show();

            if (panel.isFullWidth){
                domClass.add(this.leftPanelPane.domNode,  "leftPanelPane--fullwidth");
                this.leftPanelPane.set("splitter", false);
            }

            this.leftPanelPane.addChild(panel);
            this.mainContainer.addChild(this.leftPanelPane);
        },
        deactivatePanel(panel){
            this.mainContainer.removeChild(this.leftPanelPane);
            this.leftPanelPane.removeChild(panel);
            if (panel.isFullWidth){
                domClass.remove(this.leftPanelPane.domNode,  "leftPanelPane--fullwidth");
                this.leftPanelPane.set("splitter", true);
            }
            if (panel.isOpen) {
                panel.hide();
            }
        }
    });
});
