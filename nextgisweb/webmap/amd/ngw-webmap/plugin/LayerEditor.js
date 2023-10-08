define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/store/Memory",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/topic",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/promise/all",
    "dojox/lang/functional/object",
    "dijit/ConfirmDialog",
    "dojox/widget/Standby",
    "openlayers/ol",
    "ngw-pyramid/route",
    "ngw-webmap/ol/layer/Vector",
    "ngw-webmap/plugin/_PluginBase",
    "ngw-webmap/ui/FinishEditingDialog/FinishEditingDialog",
    "ngw-webmap/controls/editing/EditingToolbar",
    "ngw-webmap/tool/editing/CreateFeature",
    "ngw-webmap/tool/editing/ModifyFeature",
    "ngw-webmap/tool/editing/DeleteFeature",
    "ngw-webmap/MapStatesObserver",
    "@nextgisweb/pyramid/i18n!",
], function (
    declare,
    lang,
    on,
    Memory,
    xhr,
    json,
    topic,
    query,
    domClass,
    domStyle,
    all,
    fnObject,
    ConfirmDialog,
    Standby,
    ol,
    route,
    Vector,
    _PluginBase,
    FinishEditingDialog,
    EditingToolbar,
    CreateFeature,
    ModifyFeature,
    DeleteFeature,
    MapStatesObserver,
    i18n
) {
    var wkt = new ol.format.WKT(),
        finishConfirmDialog = new FinishEditingDialog();

    var CREATING_STATE_KEY = "creatingFeatures",
        MODIFYING_STATE_KEY = "modifyingFeatures",
        DELETING_STATE_KEY = "deletingFeatures",
        DRAW_KEY_INTERACTION = "draw",
        MODIFY_KEY_INTERACTION = "modify",
        SNAP_KEY_INTERACTION = "snap";

    return declare([_PluginBase], {
        _lastEditingState: null,
        _selectedResourceId: null,
        _disabled: true,

        constructor: function () {
            if (this.display.tiny) return;

            const webmapEditable = this.display.config.webmapEditable;
            if (webmapEditable) {
                this._disabled = false;
            } else {
                return;
            }

            this.mapStates = MapStatesObserver.getInstance();
            this.store = new Memory();
            this.source = new ol.source.Vector();

            this._bindTreeItem();

            this.display._mapAddControls([
                new EditingToolbar({
                    display: this.display,
                    target: this.display.leftTopControlPane,
                }),
            ]);
            this.elEditToolbar = query(".edit-toolbar")[0];
            this._buildEditingControls();
        },

        postCreate: function () {
            if (this._disabled || this.display.tiny) {
                return;
            }

            finishConfirmDialog.on("save", lang.hitch(this, this._saveChanges));
            finishConfirmDialog.on("undo", lang.hitch(this, this._undoChanges));
            finishConfirmDialog.on(
                "continue",
                lang.hitch(this, this._continueEditing)
            );

            this._buildVectorLayer();
            this._buildSelectInteraction();
            this._buildStandby();
        },

        getPluginState: function (nodeData) {
            const { type } = nodeData;
            return {
                enabled:
                    !this._disabled &&
                    type === "layer" &&
                    nodeData.plugin[this.identity] &&
                    nodeData.plugin[this.identity].writable,
                active: nodeData.editable && nodeData.editable === true,
            };
        },

        resolve: undefined,
        run: function (nodeData) {
            if (nodeData.editable) {
                return new Promise((resolve) => {
                    this.resolve = resolve;
                    this._stopEditing();
                });
            } else {
                nodeData.editable = true;
                this._startEditing(nodeData);
            }
            return Promise.resolve(undefined);
        },

        getMenuItem: function (nodeData) {
            var widget = this;
            var active = nodeData.editable && nodeData.editable === true;
            var title = active
                ? i18n.gettext("Stop editing")
                : i18n.gettext("Edit");
            return {
                icon: "material-edit",
                title: title,
                onClick: function () {
                    return widget.run(nodeData);
                },
            };
        },

        _resolveRun: function () {
            if (this.resolve) {
                this.resolve(true);
                this.resolve = undefined;
            }
        },

        _startEditing: function (nodeData) {
            this.editingItem = this._buildEditingItem(nodeData);
            this._showEditingControls();
            this._setDefaultEditMode();
        },

        _stopEditing: function () {
            this.editingItem = this._getEditingItem(this._selectedResourceId);
            finishConfirmDialog.show();
        },

        _getEditingItem: function (resourceId) {
            return this.store.get(resourceId);
        },

        _bindTreeItem: function () {
            this.display.watch("item", lang.hitch(this, this._onClickTreeItem));
        },

        _onClickTreeItem: function () {
            var itemConfig = this.display.get("itemConfig"),
                isPreviousEditing = this.editingItem !== undefined;

            this._selectedResourceId = itemConfig.layerId;
            if (isPreviousEditing) this.mapStates.activateDefaultState();

            var isResourceSupportEditing =
                itemConfig.type === "layer" &&
                itemConfig.plugin[this.identity] &&
                itemConfig.plugin[this.identity].writable;

            if (!isResourceSupportEditing) {
                this._hideEditingControls();
                this.editingItem = undefined;
                return true;
            }

            this.editingItem = this._getEditingItem(this._selectedResourceId);
            if (this.editingItem) {
                this._showEditingControls();
                this._setEditingMode(this._lastEditingState);
            } else {
                this._hideEditingControls();
            }
        },

        _buildVectorLayer: function () {
            var editorVectorLayer = new Vector("", { title: "editor.overlay" });
            editorVectorLayer.olLayer.setSource(this.source);
            this.display.map.addLayer(editorVectorLayer);
            this.editorVectorLayer = editorVectorLayer;
        },

        _selectInteraction: null,

        _buildSelectInteraction: function () {
            var selectInteraction = new ol.interaction.Select({
                layers: [this.editorVectorLayer.olLayer],
                filter: lang.hitch(this, this._filterSelectedFeatures),
                multi: false,
            });

            this.display.map.olMap.addInteraction(selectInteraction);
            selectInteraction.setActive(false);
            this._selectInteraction = selectInteraction;
            this._selectInteraction
                .getFeatures()
                .on("add", lang.hitch(this, this._deleteSelectedFeatures));
            this._selectInteraction.on("select", function () {
                selectInteraction.getFeatures().clear();
            });
        },

        _filterSelectedFeatures: function (feature) {
            var layerId = feature.getProperties().layer_id;
            return layerId === this._selectedResourceId;
        },

        _deleteSelectedFeatures: function (event) {
            var feature = event.target.item(0);
            feature.setProperties({ deleted: true });
            this.source.removeFeature(feature);
        },

        _buildStandby: function () {
            var standby = new Standby({
                target: "webmap-wrapper",
                color: "var(--secondary)",
            });
            document.body.appendChild(standby.domNode);
            standby.startup();
            this._standby = standby;
        },

        _buildEditingItem: function (nodeData) {
            const selectedResourceId = this._selectedResourceId;
            const editingItem = {
                id: selectedResourceId,
                nodeData: nodeData,
                interactions: {},
                features: new ol.Collection(),
                featuresDeleted: [],
            };

            this._fetchVectorData(editingItem);
            this._buildEditingItemInteractions(editingItem);
            this.store.put(editingItem);

            return editingItem;
        },

        _buildEditingItemInteractions: function (editingItem) {
            var itemConfig = this.display.get("itemConfig"),
                pluginConfig = itemConfig.plugin[this.identity],
                draw,
                modify,
                snap,
                mode,
                getLayout;

            mode = {
                POINT: "Point",
                LINESTRING: "LineString",
                POLYGON: "Polygon",
                MULTIPOINT: "MultiPoint",
                MULTILINESTRING: "MultiLineString",
                MULTIPOLYGON: "MultiPolygon",
                POINTZ: "Point",
                LINESTRINGZ: "LineString",
                POLYGONZ: "Polygon",
                MULTIPOINTZ: "MultiPoint",
                MULTILINESTRINGZ: "MultiLineString",
                MULTIPOLYGONZ: "MultiPolygon",
            }[pluginConfig.geometry_type];

            getLayout = function () {
                switch (pluginConfig.geometry_type) {
                    case "POINTZ":
                    case "LINESTRINGZ":
                    case "POLYGONZ":
                    case "MULTIPOINTZ":
                    case "MULTILINESTRINGZ":
                    case "MULTIPOLYGONZ":
                        return "XYZ";
                    default:
                        return "XY";
                }
            };

            draw = new ol.interaction.Draw({
                source: this.source,
                features: editingItem.features,
                type: mode,
                freehandCondition: function (event) {
                    return ol.events.condition.never(event);
                },
                geometryLayout: getLayout(),
            });

            draw.on(
                "drawend",
                lang.hitch(this, function (e) {
                    e.feature.set("layer_id", this._selectedResourceId);
                })
            );

            modify = new ol.interaction.Modify({
                features: editingItem.features,
                deleteCondition: function (event) {
                    return (
                        ol.events.condition.shiftKeyOnly(event) &&
                        ol.events.condition.singleClick(event)
                    );
                },
            });

            snap = new ol.interaction.Snap({
                source: this.source,
            });

            this._assignInteraction(DRAW_KEY_INTERACTION, editingItem, draw);
            this._assignInteraction(
                MODIFY_KEY_INTERACTION,
                editingItem,
                modify
            );
            this._assignInteraction(SNAP_KEY_INTERACTION, editingItem, snap);
        },

        _assignInteraction: function (
            keyInteraction,
            editingItem,
            interaction
        ) {
            var olMap = this.display.map.olMap;

            olMap.addInteraction(interaction);
            editingItem.interactions[keyInteraction] = interaction;
            interaction.setActive(false);
        },

        _activateInteractions: function (interactionsKeys) {
            this._changeInteractionsState(interactionsKeys, true);
        },

        _deactivateInteractions: function (interactionsKeys) {
            this._changeInteractionsState(interactionsKeys, false);
        },

        _changeInteractionsState: function (interactionsKeys, isActivate) {
            var interactions = this.editingItem.interactions;

            interactionsKeys.forEach(function (interactionKey) {
                interactions[interactionKey].setActive(isActivate);
            });
        },

        _fetchVectorData: function (editingItem) {
            const resourceId = editingItem.id;
            xhr.get(
                route.feature_layer.feature.collection({ id: resourceId }),
                {
                    handleAs: "json",
                }
            ).then(
                lang.hitch(this, function (featuresInfo) {
                    this._handleFetchedVectorData(
                        resourceId,
                        featuresInfo,
                        editingItem
                    );
                })
            );
        },

        _handleFetchedVectorData: function (
            layerId,
            featuresInfo,
            editingItem
        ) {
            var olFeatures = [];

            featuresInfo.forEach(function (featureInfo) {
                olFeatures.push(
                    new ol.Feature({
                        id: featureInfo.id,
                        layer_id: layerId,
                        geometry: wkt.readGeometry(featureInfo.geom),
                    })
                );
            });

            editingItem.features.extend(olFeatures);
            this.source.addFeatures(olFeatures);
        },

        _buildEditingControls: function () {
            this.display.mapToolbar.items.addTool(
                new ModifyFeature({
                    layerEditor: this,
                }),
                MODIFYING_STATE_KEY,
                this.elEditToolbar
            );
            this.display.mapToolbar.items.addTool(
                new CreateFeature({
                    layerEditor: this,
                }),
                CREATING_STATE_KEY,
                this.elEditToolbar
            );
            this.display.mapToolbar.items.addTool(
                new DeleteFeature({
                    layerEditor: this,
                }),
                DELETING_STATE_KEY,
                this.elEditToolbar
            );
        },

        _setDefaultEditMode: function () {
            this._setModifyingMode();
        },

        _setEditingMode: function (modeKey) {
            if (
                modeKey !== CREATING_STATE_KEY &&
                modeKey !== MODIFYING_STATE_KEY &&
                modeKey !== DELETING_STATE_KEY
            ) {
                throw Error('modeKey "' + modeKey + '" is not editing mode!');
            }

            this.mapStates.activateState(modeKey);
            this._lastEditingState = modeKey;
        },

        _setModifyingMode: function () {
            this.mapStates.activateState(MODIFYING_STATE_KEY);
        },

        _setDeletingMode: function () {
            this.mapStates.activateState(DELETING_STATE_KEY);
        },

        _setCreatingMode: function () {
            this.mapStates.activateState(CREATING_STATE_KEY);
        },

        activateCreatingMode: function () {
            this._activateInteractions(["draw", "snap"]);
            this._lastEditingState = CREATING_STATE_KEY;
        },

        deactivateCreatingMode: function () {
            this._deactivateInteractions(["draw", "snap"]);
        },

        activateModifyingMode: function () {
            this._activateInteractions(["modify", "snap"]);
            this._lastEditingState = MODIFYING_STATE_KEY;
        },

        deactivateModifyingMode: function () {
            this._deactivateInteractions(["modify", "snap"]);
        },

        activateDeletingMode: function () {
            this._selectInteraction.setActive(true);
            this._lastEditingState = DELETING_STATE_KEY;

            domStyle.set(this.display.map.olMap.getTargetElement(), {
                cursor: "crosshair",
            });
        },

        deactivateDeletingMode: function () {
            this._selectInteraction.setActive(false);

            domStyle.set(this.display.map.olMap.getTargetElement(), {
                cursor: "default",
            });
        },

        _deactivateEditingControls: function () {
            var activeState = this.mapStates.getActiveState();

            switch (activeState) {
                case CREATING_STATE_KEY:
                    this.deactivateCreatingMode();
                    this.mapStates.activateDefaultState();
                    break;
                case MODIFYING_STATE_KEY:
                    this.deactivateModifyingMode();
                    this.mapStates.activateDefaultState();
                    break;
                case DELETING_STATE_KEY:
                    this.deactivateDeletingMode();
                    this.mapStates.activateDefaultState();
                    break;
            }

            this._hideEditingControls();
        },

        _isDispalyingEditingControls: false,
        _showEditingControls: function () {
            if (this._isDispalyingEditingControls) return false;
            domClass.remove(this.elEditToolbar, "ol-hidden");
            this._isDispalyingEditingControls = true;
        },

        _hideEditingControls: function () {
            if (this._isDispalyingEditingControls === false) return false;
            domClass.add(this.elEditToolbar, "ol-hidden");
            this._isDispalyingEditingControls = false;
        },

        _undoChanges: function () {
            this._deactivateEditingControls();
            this._removeCurrentEditingItem();
            this._resolveRun();
        },

        _saveChanges: function () {
            var featuresToSave = this._getFeaturesToSave();

            this._standby.show();

            all({
                patch: this._patchFeaturesOnServer(featuresToSave.patch),
                delete: this._deleteFeaturesOnServer(featuresToSave.delete),
            }).then(
                lang.hitch(this, function (results) {
                    this._deactivateEditingControls();
                    this._removeCurrentEditingItem();
                    this.display._layers[this.display.item.id].reload();
                    topic.publish(
                        "/webmap/feature-table/refresh",
                        this._selectedResourceId
                    );
                    this._standby.hide();
                    this._resolveRun();
                })
            );
        },

        _getFeaturesToSave: function () {
            var featuresToPatch = [],
                featuresToDelete = [];

            this.editingItem.features.forEach(
                lang.hitch(this, function (feature) {
                    var featureToSave,
                        isNew = !feature.get("id"),
                        isModified =
                            !isNew &&
                            !feature.get("deleted") &&
                            feature.getRevision() > 1,
                        isDeleted = feature.get("deleted");

                    if (feature.get("layer_id") !== this._selectedResourceId)
                        return false;

                    if (isNew) featureToSave = {};
                    if (isModified || isDeleted)
                        featureToSave = { id: feature.get("id") };

                    if (featureToSave) {
                        featureToSave.geom = wkt.writeGeometry(
                            feature.getGeometry()
                        );

                        if (isDeleted) {
                            featuresToDelete.push(featureToSave);
                        } else {
                            featuresToPatch.push(featureToSave);
                        }
                    }
                })
            );

            return {
                patch: featuresToPatch,
                delete: featuresToDelete,
            };
        },

        _patchFeaturesOnServer: function (features) {
            if (!features || features.length < 1) return false;

            return xhr(
                route.feature_layer.feature.collection({
                    id: this._selectedResourceId,
                }),
                {
                    method: "PATCH",
                    handleAs: "json",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: json.stringify(features),
                }
            );
        },

        _deleteFeaturesOnServer: function (features) {
            if (!features || features.length < 1) return false;

            return xhr(
                route.feature_layer.feature.collection({
                    id: this._selectedResourceId,
                }),
                {
                    method: "DELETE",
                    handleAs: "json",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: json.stringify(features),
                }
            );
        },

        _removeCurrentEditingItem: function () {
            var olMap = this.display.map.olMap,
                source = this.source;

            fnObject.forIn(
                this.editingItem.interactions,
                function (interaction) {
                    olMap.removeInteraction(interaction);
                }
            );

            this.editingItem.features.forEach(function (feature) {
                if (feature.get("deleted")) return false;
                source.removeFeature(feature);
            });

            this.store.remove(this._selectedResourceId);
            this.editingItem.nodeData.editable = false;
            this.editingItem = undefined;
        },

        _continueEditing: function () {
            this.editingItem.nodeData.editable = true;
            this._resolveRun();
        },
    });
});
