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
    "ngw/openlayers",
    "ngw/openlayers/Map",
    "dijit/registry",
    "dijit/form/DropDownButton",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/layout/ContentPane",
    "dijit/form/ToggleButton",
    "dojo/dom-style",
    "dojo/store/JsonRest",
    "dojo/request/xhr",
    "dojo/data/ItemFileWriteStore",
    "cbtree/models/TreeStoreModel",
    "cbtree/Tree",
    "ngw/route",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    // tools
    "./tool/Base",
    "./tool/Zoom",
    "./tool/Measure",
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
    "dijit/Dialog",
    "dijit/form/TextBox",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + "cbtree/themes/claro/claro.css"
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
    openlayers,
    Map,
    registry,
    DropDownButton,
    DropDownMenu,
    MenuItem,
    ContentPane,
    ToggleButton,
    domStyle,
    JsonRest,
    xhr,
    ItemFileWriteStore,
    TreeStoreModel,
    Tree,
    route,
    i18n,
    hbsI18n,
    ToolBase,
    ToolZoom,
    ToolMeasure,
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

        // GET-параметры: подложка, слои, стартовый охват
        _urlParams: undefined,

        // Для загрузки изображения
        assetUrl: ngwConfig.assetUrl,

        constructor: function (options) {
            declare.safeMixin(this, options);

            // Извлекаем GET-параметры из URL
            this._urlParams = (function(){
                var url, query, queryObject;
                url = window.location.toString();
                if (url.indexOf("?") !== -1) {
                    query = url.substring(url.indexOf("?") + 1, url.length);
                    queryObject = ioQuery.queryToObject(query);
                    queryObject.styles = queryObject.styles.split(",");
                    queryObject.styles = array.map(queryObject.styles, function(i){ return parseInt(i, 10); });
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

            // Добавляем MID базовых карт
            array.forEach(clientSettings.basemaps, function (bm) {
                mids.basemap.push(bm.mid);
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

            this.displayProjection = new openlayers.Projection("EPSG:3857");
            this.lonlatProjection = new openlayers.Projection("EPSG:4326");

            if (this._urlParams.bbox) {
                this._extent =  new openlayers.Bounds.fromString(this._urlParams.bbox);
            } else {
                if (this.config.extent[3] > 82) { this.config.extent[3] = 82; }
                if (this.config.extent[1] < -82) { this.config.extent[1] = -82; }

                this._extent = (new openlayers.Bounds(this.config.extent))
                    .transform(this.lonlatProjection, this.displayProjection);
            }

            // Дерево элементов слоя
            this.itemTree = new Tree({
                style: "height: 100%",
                model: this.itemModel,
                autoExpand: true,
                showRoot: false
            });

            // Размещаем дерево, когда виджет будет готов
            all([this._layersDeferred, this._postCreateDeferred]).then(
                function () { widget.itemTree.placeAt(widget.layerTreePane); }
            ).then(undefined, function (err) { console.error(err); });

            // Загружаем закладки, когда кнопка будет готова
            this._postCreateDeferred.then(
                function () { widget.loadBookmarks(); }
            ).then(undefined, function (err) { console.error(err); });

            // Выбранный элемент
            this.itemTree.watch("selectedItem", function (attr, oldVal, newVal) {
                widget.set(
                    "itemConfig",
                    widget._itemConfigById[widget.itemStore.getValue(newVal, "id")]
                );
                widget.set("item", newVal);
            });

            // Карта
            all([this._midDeferred.basemap, this._startupDeferred]).then(
                function () {
                    widget._mapSetup();
                }
            ).then(undefined, function (err) { console.error(err); });

            all([this._mapDeferred, this._postCreateDeferred]).then(
                function () {
                    // Формируем список слоев базовых карты в списке выбора
                    array.forEach(Object.keys(widget.map.layers), function (key) {
                        var layer = widget.map.layers[key];
                        if (layer.isBaseLayer) {
                            widget.basemapSelect.addOption({
                                value: key,
                                label: layer.title
                            });
                        }
                    });

                    // И добавляем возможность переключения
                    widget.basemapSelect.watch("value", function (attr, oldVal, newVal) {
                        widget.map.olMap.setBaseLayer(widget.map.layers[newVal].olLayer);
                    });
                    if (widget._urlParams.base) { widget.basemapSelect.set("value", widget._urlParams.base); }
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

            // Свернем те элементы дерева, которые не отмечены как развернутые.
            // По-умолчанию все элементы развернуты за счет autoExpand у itemTree
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


            // Инструменты
            this.tools = [];
        },

        postCreate: function () {
            this.inherited(arguments);

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

            this._postCreateDeferred.resolve();
        },

        startup: function () {
            this.inherited(arguments);

            this.itemTree.startup();

            this._startupDeferred.resolve();
        },

        addTool: function (tool) {
            var btn = new ToggleButton({
                label: tool.label,
                showLabel: false,
                iconClass: tool.iconClass
            }).placeAt(this.mapToolbar);

            tool.toolbarBtn = btn;

            this.tools.push(tool);

            var display = this;
            btn.watch("checked", function (attr, oldVal, newVal) {
                if (newVal) {
                    // При включении инструмента все остальные инструменты
                    // выключаем, а этот включаем
                    array.forEach(display.tools, function (t) {
                        if (t != tool && t.toolbarBtn.get("checked")) {
                            t.toolbarBtn.set("checked", false);
                        }
                    });
                    tool.activate();
                } else {
                    // При выключении остальные инструменты не трогаем
                    tool.deactivate();
                }
            });
        },

        loadBookmarks: function () {
            if (this.config.bookmarkLayerId) {
                var store = new JsonRest({target: route.feature_layer.store({
                    id: this.config.bookmarkLayerId
                })});

                var display = this;

                store.query().then(
                    function (data) {
                        array.forEach(data, function (f) {
                            display.bookmarkMenu.addChild(new MenuItem({
                                label: f.label,
                                onClick: function () {
                                    // Отдельно запрашиваем экстент объекта
                                    xhr.get(route.feature_layer.store.item({
                                        id: display.config.bookmarkLayerId,
                                        feature_id: f.id
                                    }), {
                                        handleAs: "json",
                                        headers: { "X-Feature-Box": true }
                                    }).then(
                                        function data(featuredata) {
                                            display.map.olMap.zoomToExtent(featuredata.box);
                                        }
                                    );
                                }
                            }));
                        });
                    }
                );
            } else {
                // Если слой с закладками не указан, то прячем кнопку
                domStyle.set(this.bookmarkButton.domNode, "display", "none");
            }
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

            // Инициализация карты
            this.map = new Map(this.mapNode, {
                controls: [
                    new openlayers.Control.Attribution(),
                    new openlayers.Control.Zoom()
                ]
            });

            // Навигация по-умолчанию
            this.navigationControl = new openlayers.Control.Navigation({
                zoomBoxEnabled: true,
                dragPanOptions: {enableKinetic: false}
            });
            this.map.olMap.addControl(this.navigationControl);

            // Масштабная линейка
            this.map.olMap.addControl(new openlayers.Control.ScaleLine({bottomOutUnits: "", geodesic: true}));

            // Обновление подписи центра карты
            this.map.watch("center", function (attr, oldVal, newVal) {
                var pt = newVal.transform(widget.displayProjection, widget.lonlatProjection);
                widget.centerLonNode.innerHTML = number.format(pt.lon, {places: 3});
                widget.centerLatNode.innerHTML = number.format(pt.lat, {places: 3});
            });

            // Обновление подписи масштаба
            this.map.watch("scaleDenom", function (attr, oldVal, newVal) {
                widget.scaleInfoNode.innerHTML = "1 : " + number.format(newVal, {places: 0});
            });

            // При изменении размеров контейнера пересчитываем размер карты
            aspect.after(this.mapPane, "resize", function() {
                widget.map.olMap.updateSize();
            });

            // Инициализация базовых слоев
            var idx = 0;
            array.forEach(clientSettings.basemaps, function (bm) {
                var MID = this._mid.basemap[bm.mid];
                var layerOptions = lang.clone(bm);

                layerOptions.isBaseLayer = true;
                if (layerOptions.keyname === undefined) {
                    layerOptions.keyname = "basemap_" + idx;
                }

                try {
                    var layer = new MID(layerOptions.keyname, layerOptions);
                    this.map.addLayer(layer);
                } catch (err) {
                    console.warn("Can't initialize layer [" + layerOptions.keyname + "]: " + err);
                }

                idx = idx + 1;
            }, this);

            this.zoomToInitialExtentButton.on("click", function() {
                widget._zoomToInitialExtent();
            });

            this._zoomToInitialExtent();

            this._mapDeferred.resolve();
        },

        _mapAddLayers: function () {
            array.forEach(this._layer_order, function (id) {
                this.map.addLayer(this._layers[id]);
            }, this);
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
                        layer.olLayer.setVisibility(cond);
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

            var layer = adapter.createLayer(data);

            layer.itemId = data.id;
            layer.itemConfig = data;

            this._layers[data.id] = layer;
        },

        _toolsSetup: function () {
            this.addTool(new ToolBase({
                display: this,
                label: i18n.gettext("Pan"),
                iconClass: "iconPan"
            }));

            this.addTool(new ToolZoom({display: this, out: false}));
            this.addTool(new ToolZoom({display: this, out: true}));

            this.addTool(new ToolMeasure({display: this, order: 1}));
            this.addTool(new ToolMeasure({display: this, order: 2}));
        },

        _pluginsSetup: function () {
            this._plugins = {};

            var widget = this;
            array.forEach(Object.keys(this._mid.plugin), function (key) {
                console.log("Plugin [%s]::constructor...", key);

                var plugin =  new this._mid.plugin[key]({
                    identity: key,
                    display: this,
                    itemStore: this.itemStore
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
            // Выгружает значение выбранного слоя из itemStore в виде Object
            return this.itemStore.dumpItem(this.item);
        },

        _zoomToInitialExtent: function () {
            this.map.olMap.zoomToExtent(this._extent, true);
        },

        _getPermalink: function () {
            all({
                visbleItems: this.getVisibleItems(),
                map: this._mapDeferred
            }).then(
                lang.hitch(this, function (results) {
                    var visibleStyles, queryStr, permalink;

                    visibleStyles = array.map(
                        results.visbleItems,
                        lang.hitch(this, function (i) {
                            return this.itemStore.dumpItem(i).styleId;
                        })
                    );

                    queryStr = ioQuery.objectToQuery({
                        base: this.map.olMap.baseLayer.keyname,
                        bbox: this.map.olMap.getExtent(),
                        styles: visibleStyles.join(",")
                    });

                    permalink = window.location.origin + window.location.pathname + "?" + queryStr;

                    this.permalinkContent.set("value", decodeURIComponent(permalink));
                    this.permalinkDialog.show();

                }),
                function (error) { console.log(error); }
            );
        }
    });
});
