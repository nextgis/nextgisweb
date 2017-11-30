define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "dijit/_WidgetBase",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    "dojo/Deferred",
    "dojo/request/script",
    "openlayers/ol",
    "dojo/on",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/_base/lang",
    "dojo/_base/array",
    "ngw-feature-layer/FeatureStore",
    // settings
    "ngw/settings!feature_layer",
    // templates
    "dojo/text!./SearchPanel.hbs",
    // css
    "xstyle/css!./SearchPanel.css"
], function (
    declare,
    i18n,
    hbsI18n,
    _WidgetBase,
    DynamicPanel,
    BorderContainer,
    Deferred,
    script,
    ol,
    on,
    domClass,
    domConstruct,
    lang,
    array,
    FeatureStore,
    featureLayersettings,
    template
) {
    return declare([DynamicPanel, BorderContainer],{
        inputTimer: undefined,
        statusPane: undefined,
        MAX_SEARCH_RESULTS: 100,
        templateString: hbsI18n(template, i18n),
        activeResult: undefined,
        constructor: function (options) {
            declare.safeMixin(this,options);
        },
        postCreate: function(){
            this.inherited(arguments);

            var widget = this;

             on(this.searchField, "focus", function(){
                 domClass.add(widget.titleNode, "focus");
             });

             on(this.searchField, "blur", function(){
                 domClass.remove(widget.titleNode, "focus");
             });

             on(this.searchField, "input", function(e){
                if (widget.inputTimer) { clearInterval(widget.inputTimer); }
                widget.inputTimer = setInterval(function() {
                    clearInterval(widget.inputTimer);
                    widget.search();
                    widget.inputTimer = undefined;
                }, 750);
             });

             on(this.searchIcon, "click", function(e){
                 if (widget.inputTimer) { clearInterval(widget.inputTimer); }
                 widget.search();
                 widget.inputTimer = undefined;
             });
        },
        show: function(){
            this.inherited(arguments);
            var widget = this;

            setTimeout(function(){
                widget.searchField.focus();
            }, 300);
        },
        hide: function(){
            this.inherited(arguments);
            this.clearAll();
        },
        setStatus: function(text, statusClass){
            var statusClass = statusClass ? "search-panel__status " + statusClass : "search-panel__status";

            if (this.statusPane) this.removeStatus();

            this.statusPane = domConstruct.create("div",{
                id: "search-panel-status",
                class: statusClass,
                innerHTML: text
            });
            domConstruct.place(this.statusPane, this.contentNode, "last");
        },
        removeStatus: function(){
            if (this.statusPane){
                domConstruct.destroy(this.statusPane);
            }
        },
        search: function(){
            var widget = this,
                criteria = this.searchField.value;
            if (this._lastCriteria == criteria) { return; }

            if (criteria === "" ) {
                this.clearSearchResults();
                return;
            }

            widget.removeStatus();
            if (this.searchResultsList ) {
                this.clearSearchResults();
            }

            this._lastCriteria = criteria;

            this.loader.style.display = "block";

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
                                if (limit > 0) {
                                    widget.addSearchResult(itm);
                                }
                                limit = limit - 1;
                            })).then(function () {
                                if (limit > 0) {
                                    ndeferred.resolve(limit);
                                } else {
                                    widget.setStatus(i18n.gettext("Refine search criterion"), "search-panel__status--bg");
                                    ndeferred.reject();
                                }
                            }, function (err) {
                                // Если что-то пошло не так с конкретным слоем,
                                // то все равно продолжаем поиск по следующему
                                ndeferred.resolve();
                            }).otherwise(lang.hitch(widget, widget._breakOrError));
                        }).otherwise(lang.hitch(widget, widget._breakOrError));

                        deferred = ndeferred;
                    }
                }, this);

                if (featureLayersettings.search.nominatim) {
                    var ndeferred = new Deferred();

                    // Посылаем запрос на геокодирование
                    deferred.then(lang.hitch(this, function (limit) {
                        var NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search/";
                        var CALLBACK = "json_callback";
                        var url = NOMINATIM_SEARCH_URL + encodeURIComponent(criteria);

                        jsonpArgs = {
                            jsonp: CALLBACK,
                            query: {format: "json", limit: "30"}
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
                                    widget.addSearchResult(feature);
                                }
                                limit = limit - 1;
                            }, this);
                            if (limit > 0) {
                                ndeferred.resolve(limit);
                            } else {
                                widget.setStatus(i18n.gettext("Refine search criterion"));
                                ndeferred.reject();
                            }
                         }));
                    }), function (err) {
                        // Если что-то пошло не так с конкретным слоем,
                        // то все равно продолжаем поиск по следующему
                        ndeferred.resolve();
                    }).otherwise(lang.hitch(widget, widget._breakOrError));

                    deferred = ndeferred;
                }

                deferred.then(function (limit) {
                    widget.loader.style.display = "none";
                    if (limit == widget.MAX_SEARCH_RESULTS) {
                        widget.setStatus(i18n.gettext("Not found"));
                    }
                }).otherwise(lang.hitch(widget, widget._breakOrError));

                fdeferred.resolve(widget.MAX_SEARCH_RESULTS);
            }));
        },
        addSearchResult: function(result){
            if (!this.searchResultsList) {
                this.searchResultsList = domConstruct.create("ul", {
                    id: "search-results-list",
                    class: "list list--s list--multirow search-results"
                });
                domConstruct.place(this.searchResultsList, this.contentNode, "first");
            }
            var resultNode = domConstruct.create("li", {
                class: "list__item list__item--link",
                innerHTML: result.label,
                tabindex: -1,
                onclick: lang.hitch(this, function (e){
                    if (this.activeResult)
                        domClass.remove(this.activeResult, "active");
                    domClass.add(e.target, "active");
                    this.activeResult = e.target;
                    this.display.map.olMap.getView().fit(result.box);
                })
            });
            domConstruct.place(resultNode, this.searchResultsList);
        },
        clearAll: function(){
            this.searchField.value = "";
            this._lastCriteria = "";
            this.clearSearchResults();
        },
        clearSearchResults: function(){
            domConstruct.empty(this.contentNode);
            this.searchResultsList = undefined;
            this.statusPane = undefined;
            this.loader.style.display = "none";
        },
        _breakOrError: function (value) {
            if (this.loader)
                this.loader.style.display = "none";

            if (value !== undefined) {
                console.error(value);
            }
        }
    });
});
