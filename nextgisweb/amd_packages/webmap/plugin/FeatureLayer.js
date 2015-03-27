/* global console */
define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dijit/layout/ContentPane",
    "dijit/Menu",
    "dijit/MenuItem",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/request/xhr",
    "dojo/request/script",
    "ngw/openlayers",
    "ngw-feature-layer/FeatureStore",
    "ngw-feature-layer/FeatureGrid",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/ToolbarSeparator",
    "dijit/popup",
    "put-selector/put",
    "ngw/route",
    "./../tool/Identify"
], function (
    declare,
    _PluginBase,
    lang,
    array,
    Deferred,
    ContentPane,
    Menu,
    MenuItem,
    domConstruct,
    domStyle,
    xhr,
    script,
    openlayers,
    FeatureStore,
    FeatureGrid,
    Button,
    TextBox,
    ToolbarSeparator,
    popup,
    put,
    route,
    Identify
) {
    var MAX_SEARCH_RESULTS = 15;

    var Pane = declare([FeatureGrid], {
        closable: true,
        gutters: false,
        iconClass: "iconTable",

        postCreate: function () {
            this.inherited(arguments);

            var widget = this;

            this.btnZoomToFeature = new Button({
                label: "Перейти",
                iconClass: "iconArrowInOut",
                disabled: true,
                onClick: function () {
                    widget.zoomToFeature();
                }
            });
            this.toolbar.addChild(this.btnZoomToFeature);

            // При изменении выделенной строки изменяем доступность кнопок
            this.watch("selectedRow", function (attr, oldVal, newVal) {
                widget.btnZoomToFeature.set("disabled", newVal === null);
            });
        },

        zoomToFeature: function () {
            var display = this.plugin.display;

            xhr.get(route("feature_layer.store.item", {id: this.layerId, feature_id: this.get("selectedRow").id}), {
                handleAs: "json",
                headers: { "X-Feature-Box": true }
            }).then(
                function data(featuredata) {
                    display.map.olMap.zoomToExtent(featuredata.box);
                    display.tabContainer.selectChild(display.mainPane);
                }
            );
        }

    });

    return declare([_PluginBase], {

        constructor: function (options) {
            var plugin = this;

            this.menuItem = new MenuItem({
                label: "Таблица объектов",
                iconClass: "iconTable",
                disabled: true,
                onClick: function () {
                    plugin.openFeatureGrid();
                }
            });

            var store = this.itemStore,
                menuItem = this.menuItem;

            this.display.watch("item", function (attr, oldVal, newVal) {
                var itemConfig = plugin.display.get("itemConfig");
                menuItem.set("disabled", !(itemConfig.type == "layer" && itemConfig.plugin[plugin.identity]));
            });

            this.tool = new Identify({display: this.display});

            this.tbSearch = new TextBox({
                placeHolder: "Поиск..."
            });

            var inputTimer, blurTimer;

            this.tbSearch.on("blur", lang.hitch(this, function () {
                var searchResults = this.searchResults;
                if (searchResults && inputTimer == undefined) {
                    blurTimer = setInterval(function() {
                        popup.close(this.searchResults);
                        clearInterval(blurTimer);
                    }, 500);
                };
            }));

            this.tbSearch.on("focus", lang.hitch(this, function () {
                if (this.searchResults) {
                    popup.open({
                        popup: this.searchResults,
                        around: this.tbSearch.domNode
                    });
                };
                clearInterval(blurTimer);
            }));

            this.tbSearch.on("input", lang.hitch(this, function () {
                if (inputTimer) { clearInterval(inputTimer) };
                inputTimer = setInterval(lang.hitch(this, function () {
                    clearInterval(inputTimer);
                    this.search();
                    inputTimer = undefined;
                }), 750);
            }));
       },

        postCreate: function () {
            this.display.itemMenu.addChild(this.menuItem);
            this.display.addTool(this.tool);

            new ToolbarSeparator().placeAt(this.display.infoNode, 'first');
            this.tbSearch.placeAt(this.display.infoNode, 'first');
        },

        openFeatureGrid: function () {
            var item = this.display.dumpItem(),
                data = this.display.get('itemConfig').plugin[this.identity];

            var pane = new Pane({
                title: item.label,
                tooltip: "Таблица объектов слоя \"" + item.label + "\"",
                layerId: item.layerId,
                likeSearch: data.likeSearch,
                plugin: this
            });

            this.display.tabContainer.addChild(pane);
            this.display.tabContainer.selectChild(pane);
        },

        search: function () {
            var criteria = this.tbSearch.get('value');

            if (this.searchResults) { popup.close(this.searchResults) };

            if (criteria == "" || this._lastCriteria == criteria) { return };
            this._lastCriteria = criteria;

            this.searchResults = new Menu({});
            
            var searchResults = this.searchResults;
            domStyle.set(searchResults.domNode, "width", domStyle.get(this.tbSearch.domNode, "width") + "px");

            popup.open({
                popup: this.searchResults,
                around: this.tbSearch.domNode
            });

            var statusItem = new MenuItem({label: "", disabled: true});
            statusItem.placeAt(searchResults);

            var addResult = function (feature) {
                var mItm = new MenuItem({
                    label: put("span $", feature.label).outerHTML,
                    onClick: lang.hitch(this, function () {
                        display.map.olMap.zoomToExtent(feature.box);
                        popup.close(this.searchResults);
                    })
                });
                mItm.placeAt(statusItem, 'before');
            };

            var setStatus = function (status) {
                if (status == undefined) {
                    domStyle.set(statusItem.domNode, 'display', 'none');
                } else {
                    statusItem.set("label", status);
                };
            };

            var breakOrError = function (value) {
                if (value != undefined) {
                    console.error(value)
                }
            };

            setStatus("Идет поиск...");

            this.display.getVisibleItems().then(lang.hitch(this, function (items) {
                var deferred = new Deferred(),
                    fdeferred = deferred;

                array.forEach(items, function (itm) {
                    var id = this.display.itemStore.getValue(itm, 'id'),
                        layerId = this.display.itemStore.getValue(itm, 'layerId'),
                        itmConfig = this.display._itemConfigById[id],
                        pluginConfig = itmConfig.plugin["webmap/plugin/FeatureLayer"];
                    
                    if (pluginConfig != undefined && pluginConfig.likeSearch) {
                        var store = new FeatureStore({
                            layer: layerId,
                            featureBox: true
                        });

                        var cdeferred = deferred,
                            ndeferred = new Deferred();

                        deferred.then(function (limit) {
                            console.log("Searching layer=" + layerId + " with limit=" + limit);
                            store.query({ like: criteria }, {
                                start: 0,
                                count: limit + 1
                            }).forEach(lang.hitch(this, function(itm) {
                                if (limit > 0) { addResult(itm); };
                                limit = limit - 1;
                            })).then(function () {
                                if (limit > 0) {
                                    ndeferred.resolve(limit);
                                } else {
                                    setStatus("Уточните критерий поиска");
                                    ndeferred.reject();
                                };
                            }, function (err) {
                                // Если что-то пошло не так с конкретным слоем,
                                // то все равно продолжаем поиск по следующему
                                ndeferred.resolve(limit);
                            }).otherwise(breakOrError);
                        }).otherwise(breakOrError);

                        deferred = ndeferred;
                    };
                }, this);

                var ndeferred = new Deferred();

                // Посылаем запрос на геокодирование
                deferred.then(function (limit) {

                    var NOMINATIM_SEARCH_URL = "http://nominatim.openstreetmap.org/search/";
                    var CALLBACK = "json_callback";
                    var url = NOMINATIM_SEARCH_URL + encodeURIComponent(criteria);

                    jsonpArgs = {
                        jsonp: CALLBACK,
                        query: {format: "json"}
                    };

                    script.get(url, jsonpArgs).then(function (data) {
                        array.forEach(data, function (place) {
                            if (limit > 0) {
                                // Отформатируем ответ в виде удобном для отображения
                                // и покажем в списке ответов:

                                // Координаты приходят в WGS84
                                var extent = new openlayers.Bounds(
                                    place.boundingbox[2], place.boundingbox[0],
                                    place.boundingbox[3], place.boundingbox[1]
                                );

                                extent = extent.transform(
                                    display.lonlatProjection,
                                    display.displayProjection
                                );

                                var feature = {
                                    label: place['display_name'],
                                    box: extent
                                };

                                addResult(feature);
                            };
                            limit = limit - 1;
                        });

                        if (limit > 0) {
                            ndeferred.resolve(limit);
                        } else {
                            setStatus("Уточните критерий поиска");
                            ndeferred.reject();
                        };
                     });
                }, function (err) {
                    // Если что-то пошло не так с конкретным слоем,
                    // то все равно продолжаем поиск по следующему
                    ndeferred.resolve(limit);
                }).otherwise(breakOrError);

                deferred = ndeferred;

                deferred.then(function (limit) {
                    if (limit == MAX_SEARCH_RESULTS) {
                        setStatus("Ничего не найдено");
                    } else {
                        setStatus(undefined);
                    }
                }).otherwise(breakOrError);

                fdeferred.resolve(MAX_SEARCH_RESULTS);

            })).otherwise(console.error);
        }
    });
});