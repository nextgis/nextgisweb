define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "./_PluginBase",
    "dojo/store/Memory",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/topic",
    "dijit/CheckedMenuItem",
    "dijit/ConfirmDialog",
    "openlayers/ol",
    "ngw/route",
    "ngw/openlayers/layer/Vector",
    "ngw-pyramid/i18n!webmap",
], function (
    declare,
    lang,
    _PluginBase,
    Memory,
    xhr,
    json,
    topic,
    CheckedMenuItem,
    ConfirmDialog,
    ol,
    route,
    Vector,
    i18n
) {

    var wkt = new ol.format.WKT();

    var finish = new ConfirmDialog({
        title: i18n.gettext("Confirmation"),
        content: i18n.gettext("Finish editing?"),
        style: "width: 300px"
    });

    return declare([_PluginBase], {
        constructor: function () {
            var plugin = this;

            this.itemId = null;
            this.store = new Memory();
            this.source = new ol.source.Vector();

            this.menuItem = new CheckedMenuItem({
                label: i18n.gettext("Editing"),
                disabled: true,
                onClick: function() {
                    var item = plugin.store.get(plugin.itemId),
                        itemConfig = plugin.display.get("itemConfig"),
                        pluginConfig = itemConfig.plugin[plugin.identity];

                    if (item) {
                        item.checked = this.checked;
                    } else {
                        item = {
                            id: plugin.itemId,
                            checked: this.checked,
                            interactions: [],
                            features: new ol.Collection()
                        };

                        // Fetch Vector
                        plugin.fetchVectorData(plugin.itemId, item);

                        // Draw Interaction
                        var draw = new ol.interaction.Draw({
                            source: plugin.source,
                            features: item.features,
                            type: {
                                POINT: "Point",
                                LINESTRING: "LineString",
                                POLYGON: "Polygon",
                                MULTIPOINT: "MultiPoint",
                                MULTILINESTRING: "MultiLineString",
                                MULTIPOLYGON: "MultiPolygon"}[pluginConfig.geometry_type],
                            freehandCondition: function (event){
                                return ol.events.condition.never(event);
                            }
                        });

                        // Modify Interaction
                        var modify = new ol.interaction.Modify({
                            features: item.features,
                            deleteCondition: function (event) {
                                return ol.events.condition.shiftKeyOnly(event) &&
                                    ol.events.condition.singleClick(event);
                            }
                        });

                        draw.on("drawstart", function (e) {
                            modify.setActive(false);
                        });

                        draw.on("drawend", function (e) {
                            modify.setActive(true);
                            e.feature.set("layer_id", plugin.itemId);
                        });

                        // Snap Interaction
                        var snap = new ol.interaction.Snap({
                            source: plugin.source
                        });

                        plugin.display.map.olMap.addInteraction(draw);
                        plugin.display.map.olMap.addInteraction(modify);
                        plugin.display.map.olMap.addInteraction(snap);

                        item.interactions.push(draw);
                        item.interactions.push(modify);
                        item.interactions.push(snap);

                        plugin.store.put(item);
                    }

                    plugin.interactionsSetup(plugin.itemId);
                    plugin.item = item;
                    if (!item.checked) {
                        finish.show();
                    }
                }
            });

            this.display.watch("item", function (attr, oldVal, newVal) {
                var itemConfig = plugin.display.get("itemConfig");
                plugin.menuItem.set("disabled", !(itemConfig.type == "layer" &&
                    itemConfig.plugin[plugin.identity] &&
                    itemConfig.plugin[plugin.identity].writable));

                plugin.itemId = itemConfig.layerId;
                plugin.interactionsSetup(plugin.itemId);
                plugin.menuItem.set("checked", (itemConfig.type == "layer" &&
                    plugin.store.get(plugin.itemId) &&
                    plugin.store.get(plugin.itemId).checked));
            });
        },

        postCreate: function () {
            finish.on("execute", lang.hitch(this, this._stopEditing));
            finish.on("cancel", lang.hitch(this, this._continueEditing));

            if (this.display.layersPanel.contentWidget.itemMenu) {
                this.display.layersPanel.contentWidget.itemMenu.addChild(this.menuItem);
            }

            var editor = new Vector("", {title: "editor.overlay"});
            editor.olLayer.setSource(this.source);
            this.display.map.addLayer(editor);
        },

        fetchVectorData: function (id, item) {
            var plugin = this;

            plugin.menuItem.set("disabled", true);
            xhr.get(route.feature_layer.feature.collection({id: id}), {
                handleAs: "json"
            }).then(function (data) {
                var features = [];
                data.forEach(function (feature) {
                    features.push(new ol.Feature({
                        id: feature.id,
                        layer_id: id,
                        geometry: wkt.readGeometry(feature.geom)
                    }));
                });
                item.features.extend(features);
                plugin.source.addFeatures(features);
                plugin.menuItem.set("disabled", false);
            });
        },

        interactionsSetup: function (id) {
            if (this.store.get(id) &&
                this.store.get(id).checked) {
                topic.publish("webmap/tool/identify/off");
            } else {
                topic.publish("webmap/tool/identify/on");
            }

            this.store.query().forEach(function (item) {
                item.interactions.forEach(function (interaction) {
                    interaction.setActive(item.id === id && item.checked);
                });
            });
        },

        _stopEditing: function () {
            var features = [];
            this.item.features.forEach(lang.hitch(this, function (f) {
                var feature;
                if (f.get("layer_id") == this.itemId) {
                    if (!f.get("id")) {
                        feature = {};
                    }
                    else if (f.getRevision() > 1) {
                        feature = {
                            id: f.get("id")
                        };
                    }
                    if (feature) {
                        feature.geom = wkt.writeGeometry(f.getGeometry());
                        features.push(feature);
                    }
                }
            }));

            xhr(route.feature_layer.feature.collection({id: this.itemId}), {
                method: "PATCH",
                handleAs: "json",
                headers: {
                    "Content-Type": "application/json"
                },
                data: json.stringify(features)
            }).then(lang.hitch(this, function (data) {
                this.display._layers[this.display.item.id].reload();
            }));

            this.item.interactions.forEach(lang.hitch(this, function (i) {
                this.display.map.olMap.removeInteraction(i);
            }));
            this.item.features.forEach(lang.hitch(this, function (f) {
                this.source.removeFeature(f);
            }));
            this.store.remove(this.itemId);
        },

        _continueEditing: function () {
            this.item.checked = true;
            this.interactionsSetup(this.itemId);
            this.menuItem.set("checked", this.item.checked);
        },

    });
});
