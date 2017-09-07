/* global console */
define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dijit/layout/TabContainer",
    "dijit/Menu",
    "dijit/MenuItem",
    "dojo/dom-style",
    "dojo/request/xhr",
    "dojo/request/script",
    "dojo/topic",
    "openlayers/ol",
    "ngw-pyramid/i18n!webmap",
    "ngw-feature-layer/FeatureStore",
    "ngw-feature-layer/FeatureGrid",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/ToolbarSeparator",
    "dijit/popup",
    "put-selector/put",
    "ngw/route",
    "ngw-webmap/MapStatesObserver",
    "ngw-webmap/tool/Identify"
], function (
    declare,
    _PluginBase,
    lang,
    array,
    Deferred,
    TabContainer,
    Menu,
    MenuItem,
    domStyle,
    xhr,
    script,
    topic,
    ol,
    i18n,
    FeatureStore,
    FeatureGrid,
    Button,
    TextBox,
    ToolbarSeparator,
    popup,
    put,
    route,
    MapStatesObserver,
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
                label: i18n.gettext("Go to"),
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
                if (newVal) {
                    xhr.get(route.feature_layer.feature.item({
                        id: widget.layerId,
                        fid: newVal.id
                    }), {
                        handleAs: "json"
                    }).then(
                        function (feature) {
                            topic.publish("feature.highlight", {geom: feature.geom});
                        }
                    );
                }
            });
        },

        zoomToFeature: function () {
            var display = this.plugin.display;

            xhr.get(route.feature_layer.store.item({id: this.layerId, feature_id: this.get("selectedRow").id}), {
                handleAs: "json",
                headers: { "X-Feature-Box": true }
            }).then(
                function data(featuredata) {
                    display.map.olMap.getView().fit(featuredata.box);
                    display.tabContainer.selectChild(display.mainPane);
                }
            );
        }

    });

    return declare([_PluginBase], {

        constructor: function (options) {
            var plugin = this;

            this.menuItem = new MenuItem({
                label: i18n.gettext("Feature table"),
                iconClass: "iconTable",
                disabled: true,
                onClick: function () {
                    plugin.openFeatureGrid();
                }
            });

            this.tabContainer = new TabContainer({
                region: "bottom",
                style: "height: 45%",
                splitter: true
            });

            var store = this.itemStore,
                menuItem = this.menuItem;

            this.display.watch("item", function (attr, oldVal, newVal) {
                var itemConfig = plugin.display.get("itemConfig");
                menuItem.set("disabled", !(itemConfig.type == "layer" && itemConfig.plugin[plugin.identity]));
            });

            this.tool = new Identify({display: this.display});

            this.tbSearch = new TextBox({
                placeHolder: i18n.gettext("Search...")
            });

            var inputTimer, blurTimer;

            this.tbSearch.on("blur", lang.hitch(this, function () {
                var searchResults = this.searchResults;
                if (searchResults && inputTimer === undefined) {
                    blurTimer = setInterval(function() {
                        popup.close(this.searchResults);
                        clearInterval(blurTimer);
                    }, 500);
                }
            }));

            this.tbSearch.on("focus", lang.hitch(this, function () {
                if (this.searchResults) {
                    popup.open({
                        popup: this.searchResults,
                        around: this.tbSearch.domNode
                    });
                }
                clearInterval(blurTimer);
            }));

            this.tbSearch.on("input", lang.hitch(this, function () {
                if (inputTimer) { clearInterval(inputTimer); }
                inputTimer = setInterval(lang.hitch(this, function () {
                    clearInterval(inputTimer);
                    this.search();
                    inputTimer = undefined;
                }), 750);
            }));
       },

        postCreate: function () {
            if (this.display.layersPanel && this.display.layersPanel.contentWidget.itemMenu) {
                this.display.layersPanel.contentWidget.itemMenu.addChild(this.menuItem);
            }

            var mapStates = MapStatesObserver.getInstance();
            mapStates.addState('identifying', this.tool);
            mapStates.setDefaultState('identifying', true);

            if (this.display.mapToolbar && this.display.mapToolbar.items.infoNode) {
                //new ToolbarSeparator().placeAt(this.display.mapToolbar.items.infoNode, 'first');
                //this.tbSearch.placeAt(this.display.mapToolbar.items.infoNode, 'first');
            }
        },

        openFeatureGrid: function () {
            var item = this.display.dumpItem(),
                data = this.display.get('itemConfig').plugin[this.identity];

            var pane = new Pane({
                title: item.label,
                layerId: item.layerId,
                likeSearch: data.likeSearch,
                plugin: this,
                onClose: lang.hitch(this, function () {
                    if (this.tabContainer.getChildren().length == 1) {
                        this.display.mapContainer.removeChild(this.tabContainer);
                    }
                    return true;
                })
            });

            if (!this.tabContainer.getChildren().length) {
                this.display.mapContainer.addChild(this.tabContainer);
            }

            this.tabContainer.addChild(pane);
            this.tabContainer.selectChild(pane);
        },

        search: function () {
            var criteria = this.tbSearch.get('value');

            if (this.searchResults) { popup.close(this.searchResults); }

            if (criteria === "" || this._lastCriteria == criteria) { return; }
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

            var addResult = lang.hitch(this, function (feature) {
                var mItm = new MenuItem({
                    label: put("span $", feature.label).outerHTML,
                    onClick: lang.hitch(this, function () {
                        this.display.map.olMap.getView().fit(feature.box);
                        popup.close(this.searchResults);
                    })
                });
                mItm.placeAt(statusItem, 'before');
            });

            var setStatus = function (status) {
                if (status === undefined) {
                    domStyle.set(statusItem.domNode, 'display', 'none');
                } else {
                    statusItem.set("label", status);
                }
            };

            var breakOrError = function (value) {
                if (value !== undefined) {
                    console.error(value);
                }
            };

            setStatus(i18n.gettext("Searching..."));

            this.display.getVisibleItems().then(lang.hitch(this, function (items) {
                var deferred = new Deferred(),
                    fdeferred = deferred;

                array.forEach(items, function (itm) {
                    var id = this.display.itemStore.getValue(itm, 'id'),
                        layerId = this.display.itemStore.getValue(itm, 'layerId'),
                        itmConfig = this.display._itemConfigById[id],
                        pluginConfig = itmConfig.plugin["ngw-webmap/plugin/FeatureLayer"];
                    
                    if (pluginConfig !== undefined && pluginConfig.likeSearch) {
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
                                if (limit > 0) { addResult(itm); }
                                limit = limit - 1;
                            })).then(function () {
                                if (limit > 0) {
                                    ndeferred.resolve(limit);
                                } else {
                                    setStatus(i18n.gettext("Refine search criterion"));
                                    ndeferred.reject();
                                }
                            }, function (err) {
                                // Если что-то пошло не так с конкретным слоем,
                                // то все равно продолжаем поиск по следующему
                                ndeferred.resolve(limit);
                            }).otherwise(breakOrError);
                        }).otherwise(breakOrError);

                        deferred = ndeferred;
                    }
                }, this);

                var ndeferred = new Deferred();

                // Посылаем запрос на геокодирование
                deferred.then(lang.hitch(this, function (limit) {

                    var NOMINATIM_SEARCH_URL = "http://nominatim.openstreetmap.org/search/";
                    var CALLBACK = "json_callback";
                    var url = NOMINATIM_SEARCH_URL + encodeURIComponent(criteria);

                    jsonpArgs = {
                        jsonp: CALLBACK,
                        query: {format: "json"}
                    };

                    script.get(url, jsonpArgs).then(lang.hitch(this, function (data) {
                        array.forEach(data, function (place) {
                            if (limit > 0) {
                                // Отформатируем ответ в виде удобном для отображения
                                // и покажем в списке ответов:

                                // Координаты приходят в WGS84
                                var extent = [
                                    parseFloat(place.boundingbox[2]),
                                    parseFloat(place.boundingbox[0]),
                                    parseFloat(place.boundingbox[3]),
                                    parseFloat(place.boundingbox[1])
                                ];

                                extent = ol.proj.transformExtent(
                                    extent,
                                    this.display.lonlatProjection,
                                    this.display.displayProjection
                                );

                                var feature = {
                                    label: place.display_name,
                                    box: extent
                                };

                                addResult(feature);
                            }
                            limit = limit - 1;
                        }, this);

                        if (limit > 0) {
                            ndeferred.resolve(limit);
                        } else {
                            setStatus(i18n.gettext("Refine search criterion"));
                            ndeferred.reject();
                        }
                     }));
                }), function (err) {
                    // Если что-то пошло не так с конкретным слоем,
                    // то все равно продолжаем поиск по следующему
                    ndeferred.resolve(limit);
                }).otherwise(breakOrError);

                deferred = ndeferred;

                deferred.then(function (limit) {
                    if (limit == MAX_SEARCH_RESULTS) {
                        setStatus(i18n.gettext("Not found"));
                    } else {
                        setStatus(undefined);
                    }
                }).otherwise(breakOrError);

                fdeferred.resolve(MAX_SEARCH_RESULTS);

            }));
        }
    });
});
