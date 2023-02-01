define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/_base/lang",
    "dijit/layout/TabContainer",
    "dijit/_WidgetBase",
    "dojo/request/xhr",
    "dojo/topic",
    "openlayers/ol",
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/feature-layer/feature-grid",
    "ngw/route",
], function (
    declare,
    _PluginBase,
    lang,
    TabContainer,
    _WidgetBase,
    xhr,
    topic,
    ol,
    i18n,
    reactApp,
    FeatureGrid,
    route
) {
    var Pane = declare([_WidgetBase], {
        closable: true,
        gutters: false,
        iconClass: "iconTable",
        selectedIds: [],
        topicHandlers: [],

        postCreate: function () {
            var widget = this;
            this.inherited(arguments);
            var plugin = this.plugin;
            var data = plugin.display.get("itemConfig").plugin[plugin.identity];

            this.domNode.style.height = "100%";
            this.domNode.style.padding = "8px";

            var display = widget.plugin.display;

            var highlightedFeatures =
                display.featureHighlighter.getHighlighted();
            widget.selectedIds = [];
            for (var i = 0; i < highlightedFeatures.length; i++) {
                var f = highlightedFeatures[i];
                if (f.getProperties) {
                    var props = f.getProperties();
                    if (props.layerId === widget.layerId) {
                        widget.selectedIds.push(props.featureId);
                    }
                }
            }

            var component = reactApp.default(
                FeatureGrid.default,
                {
                    id: this.layerId,
                    readonly: data.readonly,
                    size: "small",
                    cleanSelectedOnFilter: false,
                    selectedIds: widget.selectedIds,
                    onDelete: function () {
                        if (display) {
                            var layer = display._layers[widget.layerId];
                            if (layer) {
                                layer.reload();
                            }
                        }
                    },
                    onSelect: function (newVal) {
                        widget.selectedIds = newVal;
                        var fid = newVal[0];
                        if (fid !== undefined) {
                            xhr.get(
                                route.feature_layer.feature.item({
                                    id: widget.layerId,
                                    fid: fid,
                                }),
                                {
                                    handleAs: "json",
                                }
                            ).then(function (feature) {
                                display.featureHighlighter.highlightFeature({
                                    geom: feature.geom,
                                    featureId: feature.id,
                                    layerId: widget.layerId,
                                });
                            });
                        } else {
                            display.featureHighlighter.unhighlightFeature(
                                function (f) {
                                    if (f && f.getProperties) {
                                        var props = f.getProperties();
                                        return props.layerId === widget.layerId;
                                    }
                                    return true;
                                }
                            );
                        }
                    },
                    actions: [
                        {
                            title: i18n.gettext("Go to"),
                            icon: "material-center_focus_weak",
                            disabled: function (params) {
                                return !params.selected.length;
                            },
                            action: function () {
                                widget.zoomToFeature();
                            },
                        },
                    ],
                },
                this.domNode
            );

            this.subscribe();

            this.component = component;
        },

        featureUnhighlightedEvent: function () {
            this.component.update({ selectedIds: [] });
        },

        featureHighlightedEvent: function (e) {
            if (e.featureId !== undefined) {
                if (e.layerId === this.layerId) {
                    this.component.update({ selectedIds: [e.featureId] });
                } else {
                    this.featureUnhighlightedEvent();
                }
            }
        },

        subscribe: function () {
            this.unsubscribe();
            this.topicHandlers.push(
                topic.subscribe(
                    "feature.highlight",
                    this.featureHighlightedEvent.bind(this)
                )
            );
            this.topicHandlers.push(
                topic.subscribe(
                    "feature.unhighlight",
                    this.featureUnhighlightedEvent.bind(this)
                )
            );
        },

        unsubscribe: function () {
            for (var i = 0; i < this.topicHandlers.length; i++) {
                this.topicHandlers[i].remove();
            }
            this.topicHandlers = [];
        },

        destroy: function () {
            if (this.component) {
                this.component.unmount();
            }
            this.component = null;
            this.unsubscribe();
        },

        updateSearch: function () {
            if (this.component) {
                this.component.update({ query: "" });
            }
        },

        zoomToFeature: function () {
            var display = this.plugin.display;
            var wkt = new ol.format.WKT();

            var fid = this.selectedIds[0];
            if (fid !== undefined) {
                xhr.get(
                    route.feature_layer.feature.item({
                        id: this.layerId,
                        fid: fid,
                    }),
                    {
                        handleAs: "json",
                    }
                ).then(function (feature) {
                    var geometry = wkt.readGeometry(feature.geom);
                    display.map.zoomToFeature(
                        new ol.Feature({ geometry: geometry })
                    );
                    display.tabContainer.selectChild(display.mainPane);
                });
            }
        },
    });

    return declare([_PluginBase], {
        constructor: function (options) {
            this.tabContainer = new TabContainer({
                region: "bottom",
                style: "height: 45%",
                splitter: true,
            });
        },

        getPluginState: function (nodeData) {
            const {type, plugin} = nodeData;
            return {
                enabled: type === "layer" && plugin[plugin.identity],
            };
        },
        
        run: function () {
            this.openFeatureGrid();
            return Promise.resolve(undefined);
        },

        postCreate: function () {
            this._bindEvents();
        },

        _bindEvents: function () {
            topic.subscribe(
                "/webmap/feature-table/refresh",
                lang.hitch(this, function (layerId) {
                    if (!this._openedLayersById.hasOwnProperty(layerId)) return;
                    var pane = this._openedLayersById[layerId];
                    pane.updateSearch();
                })
            );
        },

        _openedLayersById: {},
        openFeatureGrid: function () {
            var item = this.display.dumpItem(),
                layerId = item.layerId,
                pane;

            if (this._openedLayersById.hasOwnProperty(layerId)) {
                pane = this._openedLayersById[layerId];
                this.tabContainer.selectChild(pane);
                return;
            }

            pane = this._buildPane(layerId, item);

            this._openedLayersById[layerId] = pane;

            if (!this.tabContainer.getChildren().length) {
                this.display.mapContainer.addChild(this.tabContainer);
            }

            this.tabContainer.addChild(pane);
            this.tabContainer.selectChild(pane);
        },

        _buildPane: function (layerId, item) {
            var data = this.display.get("itemConfig").plugin[this.identity];

            return new Pane({
                title: item.label,
                layerId: layerId,
                readonly: data.readonly,
                likeSearch: data.likeSearch,
                plugin: this,
                onClose: lang.hitch(this, function () {
                    delete this._openedLayersById[layerId];
                    if (this.tabContainer.getChildren().length == 1) {
                        this.display.mapContainer.removeChild(
                            this.tabContainer
                        );
                    }
                    return true;
                }),
            });
        },
    });
});
