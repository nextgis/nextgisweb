define([
    "dojo/_base/declare",
    "@nextgisweb/pyramid/i18n!",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    "dojo/debounce",
    "dojo/topic",
    "dojo/Deferred",
    "dojo/request/xhr",
    "openlayers/ol",
    "dojo/on",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/_base/lang",
    "dojo/_base/array",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/webmap/coordinates/parser",
    "ngw-pyramid/utils/coordinateConverter",
    // settings
    "@nextgisweb/pyramid/settings!webmap",
    // templates
    "dojo/text!./SearchPanel.hbs",
    // css
    "xstyle/css!./SearchPanel.css"
], function (
    declare,
    i18n,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    DynamicPanel,
    BorderContainer,
    debounce,
    topic,
    Deferred,
    xhr,
    ol,
    on,
    domClass,
    domConstruct,
    lang,
    array,
    api,
    coordinatesParser,
    coordinateConverter,
    webmapSettings,
    template
) {
    const GEO_JSON_FORMAT = new ol.format.GeoJSON();

    return declare([DynamicPanel, BorderContainer], {
        inputTimer: undefined,
        statusPane: undefined,
        MAX_SEARCH_RESULTS: 100,
        // templateString: i18n.renderTemplate(template),
        activeResult: undefined,

        constructor: function (options) {
            declare.safeMixin(this, options);

            this.contentWidget = new (declare(
                [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
                {
                    templateString: i18n.renderTemplate(template),
                    region: "top",
                    gutters: false
                }
            ))();
        },

        postCreate: function () {
            this.inherited(arguments);

            var widget = this;

            on(this.contentWidget.searchField, "focus", function () {
                domClass.add(widget.contentWidget.controlsNode, "focus");
            });

            on(this.contentWidget.searchField, "blur", function () {
                domClass.remove(widget.contentWidget.controlsNode, "focus");
            });

            on(this.contentWidget.searchField, 'input', debounce(() => {
                widget.search();
            }, 750));

            on(this.contentWidget.searchIcon, 'click', () => {
                widget.search();
            });
        },

        show: function () {
            this.inherited(arguments);

            setTimeout(() => {
                this.contentWidget.searchField.focus();
            }, 300);
        },

        hide: function () {
            this.inherited(arguments);
            this.clearAll();
        },

        setStatus: function (text, statusClass) {
            const statusPaneCssClass = statusClass ? 'search-panel__status ' + statusClass :
                'search-panel__status';

            this.removeStatus();

            this.statusPane = domConstruct.create('div', {
                id: 'search-panel-status',
                class: statusPaneCssClass,
                innerHTML: text
            });
            domConstruct.place(this.statusPane, this.contentWidget.contentNode, 'last');
        },

        removeStatus: function () {
            if (this.statusPane) {
                domConstruct.destroy(this.statusPane);
            }
        },

        search: function () {
            var widget = this,
                criteria = this.contentWidget.searchField.value;

            if (this._lastCriteria === criteria) {
                return;
            }

            if (criteria === "") {
                this.clearSearchResults();
                return;
            }

            widget.removeStatus();
            if (this.searchResultsList) {
                this.clearSearchResults();
            }

            this._lastCriteria = criteria;

            this.contentWidget.loader.style.display = "block";

            this.display.getVisibleItems().then(lang.hitch(this, function (items) {
                var deferred = new Deferred(),
                    fdeferred = deferred;

                const coordinatesDeferred = new Deferred();
                deferred.then(limit => {
                    try {
                        const newLimit = this.parseCoordinatesInput(criteria, limit);
                        if (newLimit > 0) {
                            coordinatesDeferred.resolve(newLimit);
                        } else {
                            widget.setStatus(i18n.gettext('Refine search criterion'), 'search-panel__status--bg');
                            coordinatesDeferred.reject();
                        }
                    } catch (error) {
                        coordinatesDeferred.resolve(limit);
                    }
                });
                deferred = coordinatesDeferred;

                array.forEach(items, function (itm) {
                    var id = this.display.itemStore.getValue(itm, "id"),
                        layerId = this.display.itemStore.getValue(itm, "layerId"),
                        itmConfig = this.display._itemConfigById[id],
                        pluginConfig = itmConfig.plugin["ngw-webmap/plugin/FeatureLayer"];

                    if (pluginConfig !== undefined && pluginConfig.likeSearch) {
                        var cdeferred = deferred,
                            ndeferred = new Deferred();

                        deferred.then(function (limit) {
                            const url = api.routeURL("feature_layer.feature.collection", {
                                id: layerId
                            });

                            xhr.get(url, {
                                handleAs: "json",
                                query: {
                                    ilike: criteria,
                                    limit: limit,
                                    geom_format: "geojson",
                                    label: true
                                }
                            }).then(lang.hitch(this, function (features) {
                                features.forEach(feature => {
                                    if (limit > 0) {
                                        const searchResult = {
                                            label: feature.label,
                                            geometry: GEO_JSON_FORMAT.readGeometry(feature.geom),
                                            type: "layers"
                                        };
                                        widget.addSearchResult(searchResult);
                                    }
                                    limit = limit - 1;
                                });

                                if (limit > 0) {
                                    ndeferred.resolve(limit);
                                } else {
                                    widget.setStatus(i18n.gettext("Refine search criterion"), "search-panel__status--bg");
                                    ndeferred.reject();
                                }
                            }), function (err) {
                                // Continue with other layer if some layer is failed
                                ndeferred.resolve();
                            }).otherwise(lang.hitch(widget, widget._breakOrError));
                        }).otherwise(lang.hitch(widget, widget._breakOrError));

                        deferred = ndeferred;
                    }
                }, this);

                if (webmapSettings.address_search_enabled &&
                    webmapSettings.address_geocoder === 'nominatim') {
                    var ndeferred = new Deferred();

                    deferred.then(lang.hitch(this, function (limit) {
                        var NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

                        var query = {
                            format: "geojson",
                            limit: "30",
                            q: criteria,
                            polygon_geojson: 1
                        };

                        if (webmapSettings.address_search_extent) {
                            var extent = this.display.config.extent;
                            query.bounded = "1";
                            query.viewbox = extent.join(",");
                        }
                        
                        if (webmapSettings.nominatim_countrycodes) {
                            query.countrycodes = webmapSettings.nominatim_countrycodes;
                        }

                        xhr.get(NOMINATIM_SEARCH_URL, {
                            handleAs: "json",
                            query: query,
                            headers: {"X-Requested-With": null}
                        }).then(lang.hitch(this, function (geojson) {
                            const features = geojson.features;

                            array.forEach(features, function (feature) {
                                if (limit > 0) {
                                    const searchResult = {
                                        label: feature.properties.display_name,
                                        geometry: GEO_JSON_FORMAT.readGeometry(feature.geometry, {
                                            featureProjection: this.display.displayProjection
                                        }),
                                        type: "public"
                                    };
                                    widget.addSearchResult(searchResult);
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
                        // Continue with other layer if some layer is failed
                        ndeferred.resolve();
                    }).otherwise(lang.hitch(widget, widget._breakOrError));

                    deferred = ndeferred;
                }

                if (webmapSettings.address_search_enabled &&
                    webmapSettings.address_geocoder === 'yandex') {
                    var ndeferred = new Deferred();

                    deferred.then(lang.hitch(this, function (limit) {
                        var YANDEX_SEARCH_URL = "https://geocode-maps.yandex.ru/1.x/",
                            yandexApiGeocoderKey = webmapSettings.yandex_api_geocoder_key;

                        var query = {
                            apikey: yandexApiGeocoderKey,
                            geocode: criteria,
                            format: 'json'
                        };

                        if (webmapSettings.address_search_extent && this.display.config.extent) {
                            var extent = this.display.config.extent;
                            query.bbox = `${extent[0]},${extent[1]}~${extent[2]},${extent[3]}`;
                        }

                        xhr.get(YANDEX_SEARCH_URL, {
                            handleAs: "json",
                            query: query
                        }).then(lang.hitch(this, function (yaGeocoderResponse) {
                            let featureMembers = [];
                            if (yaGeocoderResponse && yaGeocoderResponse.response &&
                                yaGeocoderResponse.response.GeoObjectCollection &&
                                yaGeocoderResponse.response.GeoObjectCollection.featureMember) {
                                featureMembers = yaGeocoderResponse.response.GeoObjectCollection.featureMember;
                            }

                            array.forEach(featureMembers, function (featureMember) {
                                if (!featureMember.GeoObject) {
                                    return false;
                                }

                                if (limit > 0) {
                                    const geoObject = featureMember.GeoObject;
                                    const [lon, lat] = featureMember.GeoObject.Point.pos.split(" ");
                                    const searchResult = {
                                        label: geoObject.name,
                                        geometry: GEO_JSON_FORMAT.readGeometry({
                                            "type": "Point",
                                            "coordinates": [lon, lat]
                                        }, {
                                            featureProjection: this.display.displayProjection
                                        }),
                                        type: "public"
                                    };
                                    widget.addSearchResult(searchResult);
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
                        ndeferred.resolve();
                    }).otherwise(lang.hitch(widget, widget._breakOrError));

                    deferred = ndeferred;
                }

                deferred.then(function (limit) {
                    widget.contentWidget.loader.style.display = "none";
                    if (limit === widget.MAX_SEARCH_RESULTS) {
                        widget.setStatus(i18n.gettext("Not found"));
                    }
                }).otherwise(lang.hitch(widget, widget._breakOrError));

                fdeferred.resolve(widget.MAX_SEARCH_RESULTS);
            }));
        },

        parseCoordinatesInput: function (criteria, limit) {
            const coordinates = coordinatesParser.parse(criteria);

            coordinates.forEach(c => {
                const {lat, lon} = c;
                const searchResult = {
                    label: coordinateConverter.lonLatToDM([lon, lat]),
                    geometry: GEO_JSON_FORMAT.readGeometry({
                        'type': 'Point',
                        'coordinates': [lon, lat]
                    }, {
                        featureProjection: this.display.displayProjection
                    }),
                    type: 'place'
                };
                this.addSearchResult(searchResult);
                limit = limit - 1;
            });
            return limit;
        },

        addSearchResult: function (result) {
            if (!this.searchResultsList) {
                this.searchResultsList = domConstruct.create("ul", {
                    id: "search-results-list",
                    class: "list list--s list--multirow search-results"
                });
                domConstruct.place(this.searchResultsList, this.contentWidget.contentNode, "first");
            }

            const svg = `<svg class="icon" fill="#919191"><use xlink:href="#icon-material-${result.type}"/></svg>`;
            const resultNode = domConstruct.create("li", {
                class: `list__item list__item--link ${result.type}`,
                innerHTML: `<span>${result.label} ${svg}</span>`,
                tabindex: -1,
                onclick: lang.hitch(this, function (e) {
                    if (this.activeResult)
                        domClass.remove(this.activeResult, "active");
                    domClass.add(e.target, "active");
                    this.activeResult = e.target;

                    this.display.map.zoomToFeature(
                        new ol.Feature({geometry: result.geometry})
                    );
                    topic.publish("feature.highlight", {
                        olGeometry: result.geometry
                    });
                })
            });
            domConstruct.place(resultNode, this.searchResultsList);
        },

        clearAll: function () {
            this.contentWidget.searchField.value = "";
            this._lastCriteria = "";
            this.clearSearchResults();
        },

        clearSearchResults: function () {
            domConstruct.empty(this.contentWidget.contentNode);
            this.searchResultsList = undefined;
            this.statusPane = undefined;
            this.contentWidget.loader.style.display = "none";
        },

        _breakOrError: function (value) {
            if (this.contentWidget.loader)
                this.contentWidget.loader.style.display = "none";

            if (value !== undefined) {
                console.error(value);
            }
        }
    });
});
