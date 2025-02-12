import { reaction } from "mobx";
import { Collection, Feature } from "ol";
import type { CollectionEvent } from "ol/Collection";
import type { FeatureLike } from "ol/Feature";
import { never, shiftKeyOnly, singleClick } from "ol/events/condition";
import WKT from "ol/format/WKT";
import type { Geometry } from "ol/geom";
import type { Type as OlGeometryType } from "ol/geom/Geometry";
import { Draw, Modify, Select, Snap } from "ol/interaction";
import type { Interaction } from "ol/interaction";
import { Vector as VectorSource } from "ol/source";

import { FeatureEditorModal } from "@nextgisweb/feature-layer/feature-editor-modal";
import type { FeaureLayerGeometryType } from "@nextgisweb/feature-layer/type/api";
import { errorModal } from "@nextgisweb/gui/error";
import showModal from "@nextgisweb/gui/showModal";
import { findNode } from "@nextgisweb/gui/util/tree";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import { ToolCreateFeature } from "@nextgisweb/webmap/map-controls/tool/editing/CreateFeature";
import { ToolDeleteFeature } from "@nextgisweb/webmap/map-controls/tool/editing/DeleteFeature";
import { ToolModifyFeature } from "@nextgisweb/webmap/map-controls/tool/editing/ModifyFeature";
import type {
    PluginMenuItem,
    PluginParams,
    PluginState,
} from "@nextgisweb/webmap/type";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { EditingToolbar } from "../../map-controls/control/editing/EditingToolbar";
import MapStatesObserverSingleton from "../../map-state-observer";
import type { MapStatesObserver } from "../../map-state-observer/MapStatesObserver";
import VectorLayer from "../../ol/layer/Vector";
import { showFinishEditingDialog } from "../../ui/finish-editing-dialog";
import { PluginBase } from "../PluginBase";
import type { LayerEditorWebMapPluginConfig } from "../type";

import type {
    EditingItem,
    FeatureInfo,
    FeatureToSave,
    FeaturesToSave,
} from "./type";

export class LayerEditor extends PluginBase {
    private static readonly CREATING_STATE_KEY = "creatingFeatures";
    private static readonly MODIFYING_STATE_KEY = "modifyingFeatures";
    private static readonly DELETING_STATE_KEY = "deletingFeatures";
    private static readonly DRAW_KEY_INTERACTION = "draw";
    private static readonly MODIFY_KEY_INTERACTION = "modify";
    private static readonly SNAP_KEY_INTERACTION = "snap";

    private wkt = new WKT();
    private source!: VectorSource;

    private mapStates!: MapStatesObserver;
    private store!: Map<number, EditingItem>;
    private editorVectorLayer!: VectorLayer;
    private selectInteraction!: Select;

    private elEditToolbar!: HTMLElement;

    private lastEditingState: string | null = null;
    private selectedResourceId: number | null = null;
    private disabled = true;
    private isDisplayingEditingControls = false;
    private editingItem?: EditingItem;
    private resolve?: (value: boolean | undefined) => void;

    private treeItemReactionDisposer?: () => void;

    constructor(options: PluginParams) {
        super(options);

        if (this.display.tiny) return;

        if (!this.display.config.webmapEditable) {
            this.disabled = true;
            return;
        }

        this.disabled = false;
        this.source = new VectorSource();
        this.store = new Map();
        this.mapStates = MapStatesObserverSingleton.getInstance();

        this.bindTreeItem();
        this.setupEditingToolbar();
        this.initializeComponents();
    }

    getPluginState(nodeData: LayerItemConfig): PluginState {
        const state = super.getPluginState(nodeData);
        return {
            ...state,
            enabled:
                !this.disabled &&
                nodeData.type === "layer" &&
                (
                    nodeData.plugin[
                        this.identity
                    ] as LayerEditorWebMapPluginConfig
                )?.writable,
            active: nodeData.editable === true,
        };
    }

    async run(nodeData: LayerItemConfig): Promise<boolean | undefined> {
        if (nodeData.editable) {
            return new Promise((resolve) => {
                this.resolve = resolve;
                this.stopEditing();
            });
        } else {
            this.setItemEditable(nodeData, true);
            this.startEditing(nodeData);
            return Promise.resolve(undefined);
        }
    }

    destroy(): void {
        if (this.treeItemReactionDisposer) {
            this.treeItemReactionDisposer();
            this.treeItemReactionDisposer = undefined;
        }
    }

    getMenuItem(nodeData: LayerItemConfig): PluginMenuItem {
        const active = nodeData.editable === true;
        const title = active ? gettext("Stop editing") : gettext("Edit");

        return {
            icon: "material-edit",
            title,
            onClick: async () => {
                await this.run(nodeData);
            },
        };
    }

    deactivateCreatingMode(): void {
        this.deactivateInteractions([
            LayerEditor.DRAW_KEY_INTERACTION,
            LayerEditor.SNAP_KEY_INTERACTION,
        ]);
    }

    activateModifyingMode(): void {
        this.activateInteractions([
            LayerEditor.MODIFY_KEY_INTERACTION,
            LayerEditor.SNAP_KEY_INTERACTION,
        ]);
        this.lastEditingState = LayerEditor.MODIFYING_STATE_KEY;
    }

    activateDeletingMode(): void {
        this.selectInteraction.setActive(true);
        this.lastEditingState = LayerEditor.DELETING_STATE_KEY;

        const mapElement = this.display.map.olMap.getTargetElement();
        if (mapElement) {
            mapElement.style.cursor = "crosshair";
        }
    }

    deactivateDeletingMode(): void {
        this.selectInteraction.setActive(false);

        const mapElement = this.display.map.olMap.getTargetElement();
        if (mapElement) {
            mapElement.style.cursor = "default";
        }
    }

    deactivateModifyingMode(): void {
        this.deactivateInteractions([
            LayerEditor.MODIFY_KEY_INTERACTION,
            LayerEditor.SNAP_KEY_INTERACTION,
        ]);
    }

    activateCreatingMode(): void {
        this.activateInteractions([
            LayerEditor.DRAW_KEY_INTERACTION,
            LayerEditor.SNAP_KEY_INTERACTION,
        ]);
        this.lastEditingState = LayerEditor.CREATING_STATE_KEY;
    }

    private setItemEditable(nodeData: LayerItemConfig, status: boolean) {
        const webmapItems = [...this.display.webmapStore.webmapItems];

        const editableItem = findNode(
            webmapItems,
            (item) => item.id === nodeData.id
        );
        if (editableItem && editableItem.type === "layer") {
            editableItem.editable = status;
            this.display.webmapStore.setWebmapItems(webmapItems);
        }
    }

    private initializeComponents(): void {
        if (this.disabled || this.display.tiny) return;

        this.buildVectorLayer();
        this.buildSelectInteraction();
    }

    private buildVectorLayer(): void {
        const editorVectorLayer = new VectorLayer("", {
            title: "editor.overlay",
        });
        editorVectorLayer.olLayer.setSource(this.source);
        this.display.map.addLayer(editorVectorLayer);
        this.editorVectorLayer = editorVectorLayer;
    }

    private buildSelectInteraction(): void {
        this.selectInteraction = new Select({
            layers: [this.editorVectorLayer.olLayer],
            filter: (feature) => this.filterSelectedFeatures(feature),
            multi: false,
        });

        this.display.map.olMap.addInteraction(this.selectInteraction);
        this.selectInteraction.setActive(false);

        this.selectInteraction
            .getFeatures()
            .on("add", (event) => this.deleteSelectedFeatures(event));

        this.selectInteraction.on("select", () => {
            this.selectInteraction.getFeatures().clear();
        });
    }

    private setupEditingToolbar(): void {
        const editingToolbar = new EditingToolbar({
            display: this.display,
            target: this.display.leftTopControlPane,
        });
        this.display._mapAddControls([editingToolbar]);
        this.elEditToolbar = editingToolbar.element;
        this.buildEditingControls();
    }

    private buildEditingControls(): void {
        const mapToolbar = this.display.mapToolbar;
        if (mapToolbar) {
            mapToolbar.items.addTool(
                new ToolModifyFeature({
                    layerEditor: this,
                    display: this.display,
                }),
                LayerEditor.MODIFYING_STATE_KEY,
                this.elEditToolbar
            );

            mapToolbar.items.addTool(
                new ToolCreateFeature({
                    layerEditor: this,
                    display: this.display,
                }),
                LayerEditor.CREATING_STATE_KEY,
                this.elEditToolbar
            );

            mapToolbar.items.addTool(
                new ToolDeleteFeature({
                    layerEditor: this,
                    display: this.display,
                }),
                LayerEditor.DELETING_STATE_KEY,
                this.elEditToolbar
            );
        }
    }

    private bindTreeItem(): void {
        this.treeItemReactionDisposer = reaction(
            () => this.display.item,
            () => {
                this.onClickTreeItem();
            }
        );
    }

    private async onClickTreeItem(): Promise<boolean> {
        const itemConfig = this.display.itemConfig;
        if (!itemConfig) {
            throw new Error("There is no itemConfig in display");
        }
        const isPreviousEditing = this.editingItem !== undefined;

        this.selectedResourceId = itemConfig.layerId;
        if (isPreviousEditing) {
            this.mapStates.activateDefaultState();
        }

        const isResourceSupportEditing =
            itemConfig.type === "layer" &&
            itemConfig.plugin[this.identity] &&
            (itemConfig.plugin[this.identity] as LayerEditorWebMapPluginConfig)
                .writable;

        if (!isResourceSupportEditing) {
            this.hideEditingControls();
            this.editingItem = undefined;
            return true;
        }

        this.editingItem = this.store.get(this.selectedResourceId);
        if (this.editingItem) {
            this.showEditingControls();
            this.setEditingMode(this.lastEditingState);
        } else {
            this.hideEditingControls();
        }

        return true;
    }

    private startEditing(nodeData: LayerItemConfig): void {
        this.editingItem = this.buildEditingItem(nodeData);
        this.showEditingControls();
        this.setDefaultEditMode();
    }

    private stopEditing(): void {
        if (!this.selectedResourceId) return;

        this.editingItem = this.store.get(this.selectedResourceId);
        showFinishEditingDialog({
            onSave: () => this.saveChanges(),
            onUndo: () => this.undoChanges(),
            onContinue: () => this.continueEditing(),
        });
    }

    private buildEditingItem(nodeData: LayerItemConfig): EditingItem {
        if (!this.selectedResourceId) throw new Error("No resource selected");

        const editingItem: EditingItem = {
            id: this.selectedResourceId,
            nodeData,
            interactions: {},
            features: new Collection<Feature<Geometry>>(),
            featuresDeleted: [],
        };

        this.fetchVectorData(editingItem);
        this.buildEditingItemInteractions(editingItem);
        this.store.set(editingItem.id, editingItem);

        return editingItem;
    }

    private buildEditingItemInteractions(editingItem: EditingItem): void {
        const itemConfig = this.display.itemConfig;
        const pluginConfig = itemConfig?.plugin[
            this.identity
        ] as LayerEditorWebMapPluginConfig;
        const pluginGeometryType =
            pluginConfig.geometry_type as FeaureLayerGeometryType;

        const getGeometryType = () => {
            const mapping: Record<FeaureLayerGeometryType, OlGeometryType> = {
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
            };
            return mapping[pluginGeometryType];
        };

        const getLayout = (): Draw["geometryLayout_"] => {
            const zTypes: FeaureLayerGeometryType[] = [
                "POINTZ",
                "LINESTRINGZ",
                "POLYGONZ",
                "MULTIPOINTZ",
                "MULTILINESTRINGZ",
                "MULTIPOLYGONZ",
            ];
            return zTypes.includes(pluginGeometryType) ? "XYZ" : "XY";
        };

        const draw = new Draw({
            source: this.source,
            features: editingItem.features,
            type: getGeometryType(),
            freehandCondition: never,
            geometryLayout: getLayout(),
        });

        draw.on("drawend", (e) => {
            e.feature.set("layer_id", this.selectedResourceId);
            if (this.selectedResourceId) {
                showModal(FeatureEditorModal, {
                    editorOptions: {
                        mode: "return",
                        resourceId:
                            this.selectedResourceId !== null
                                ? this.selectedResourceId
                                : undefined,
                        onOk: (value) => {
                            e.feature.set("attribution", value);
                        },
                    },
                });
            }
        });

        const modify = new Modify({
            features: editingItem.features,
            deleteCondition: (event) => {
                return shiftKeyOnly(event) && singleClick(event);
            },
        });

        const snap = new Snap({
            source: this.source,
        });

        this.assignInteraction(
            LayerEditor.DRAW_KEY_INTERACTION,
            editingItem,
            draw
        );
        this.assignInteraction(
            LayerEditor.MODIFY_KEY_INTERACTION,
            editingItem,
            modify
        );
        this.assignInteraction(
            LayerEditor.SNAP_KEY_INTERACTION,
            editingItem,
            snap
        );
    }

    private assignInteraction(
        keyInteraction: string,
        editingItem: EditingItem,
        interaction: Interaction
    ): void {
        this.display.map.olMap.addInteraction(interaction);
        editingItem.interactions[keyInteraction] = interaction;
        interaction.setActive(false);
    }

    private async fetchVectorData(editingItem: EditingItem): Promise<void> {
        try {
            const resourceId = editingItem.id;
            const featuresInfo = await route(
                "feature_layer.feature.collection",
                {
                    id: resourceId,
                }
            ).get({ query: { extensions: [] } });

            this.handleFetchedVectorData(resourceId, featuresInfo, editingItem);
        } catch (error) {
            errorModal(error);
        }
    }

    private handleFetchedVectorData(
        layerId: number,
        featuresInfo: FeatureInfo[],
        editingItem: EditingItem
    ): void {
        const olFeatures = featuresInfo.map(
            (featureInfo) =>
                new Feature({
                    id: featureInfo.id,
                    layer_id: layerId,
                    geometry: this.wkt.readGeometry(featureInfo.geom),
                })
        );

        editingItem.features.extend(olFeatures);
        this.source.addFeatures(olFeatures);
    }

    private setDefaultEditMode(): void {
        this.setModifyingMode();
    }

    private setEditingMode(modeKey: string | null): void {
        if (
            !modeKey ||
            ![
                LayerEditor.CREATING_STATE_KEY,
                LayerEditor.MODIFYING_STATE_KEY,
                LayerEditor.DELETING_STATE_KEY,
            ].includes(modeKey)
        ) {
            throw new Error(`Invalid mode key: ${modeKey}`);
        }

        this.mapStates.activateState(modeKey);
        this.lastEditingState = modeKey;
    }

    private setModifyingMode(): void {
        this.mapStates.activateState(LayerEditor.MODIFYING_STATE_KEY);
    }

    private setDeletingMode(): void {
        this.mapStates.activateState(LayerEditor.DELETING_STATE_KEY);
    }

    private setCreatingMode(): void {
        this.mapStates.activateState(LayerEditor.CREATING_STATE_KEY);
    }

    private activateInteractions(interactionsKeys: string[]): void {
        this.changeInteractionsState(interactionsKeys, true);
    }

    private deactivateInteractions(interactionsKeys: string[]): void {
        this.changeInteractionsState(interactionsKeys, false);
    }

    private changeInteractionsState(
        interactionsKeys: string[],
        isActivate: boolean
    ): void {
        if (!this.editingItem) return;

        interactionsKeys.forEach((interactionKey) => {
            this.editingItem!.interactions[interactionKey].setActive(
                isActivate
            );
        });
    }

    private filterSelectedFeatures(feature: FeatureLike): boolean {
        const layerId = feature.getProperties().layer_id;
        return layerId === this.selectedResourceId;
    }

    private deleteSelectedFeatures(event: CollectionEvent): void {
        const feature = event.target.item(0);
        feature.setProperties({ deleted: true });
        this.source.removeFeature(feature);
    }

    private showEditingControls(): void {
        if (this.isDisplayingEditingControls) return;
        this.elEditToolbar.classList.remove("ol-hidden");
        this.isDisplayingEditingControls = true;
    }

    private hideEditingControls(): void {
        if (!this.isDisplayingEditingControls) return;
        this.elEditToolbar.classList.add("ol-hidden");
        this.isDisplayingEditingControls = false;
    }

    private deactivateEditingControls(): void {
        const activeState = this.mapStates.getActiveState();

        switch (activeState) {
            case LayerEditor.CREATING_STATE_KEY:
                this.deactivateCreatingMode();
                this.mapStates.activateDefaultState();
                break;
            case LayerEditor.MODIFYING_STATE_KEY:
                this.deactivateModifyingMode();
                this.mapStates.activateDefaultState();
                break;
            case LayerEditor.DELETING_STATE_KEY:
                this.deactivateDeletingMode();
                this.mapStates.activateDefaultState();
                break;
        }

        this.hideEditingControls();
    }

    private getFeaturesToSave(): FeaturesToSave {
        const featuresToPatch: FeatureToSave[] = [];
        const featuresToDelete: FeatureToSave[] = [];

        if (!this.editingItem) {
            return { patch: featuresToPatch, delete: featuresToDelete };
        }

        this.editingItem.features.forEach((feature) => {
            if (feature.get("layer_id") !== this.selectedResourceId) {
                return;
            }

            const isNew = !feature.get("id");
            const isModified =
                !isNew && !feature.get("deleted") && feature.getRevision() > 1;
            const isDeleted = feature.get("deleted");

            let featureToSave: Partial<FeatureToSave> | undefined = undefined;

            if (isNew) {
                const attribution = feature.get("attribution") || {};
                featureToSave = { ...attribution };
            } else if (isModified || isDeleted) {
                featureToSave = { id: feature.get("id") };
            }

            if (featureToSave) {
                featureToSave.geom = this.wkt.writeGeometry(
                    feature.getGeometry()!
                );

                if (isDeleted) {
                    featuresToDelete.push(featureToSave as FeatureToSave);
                } else {
                    featuresToPatch.push(featureToSave as FeatureToSave);
                }
            }
        });

        return {
            patch: featuresToPatch,
            delete: featuresToDelete,
        };
    }

    private async saveChanges(): Promise<void> {
        const featuresToSave = this.getFeaturesToSave();

        try {
            await Promise.all([
                this.patchFeaturesOnServer(featuresToSave.patch),
                this.deleteFeaturesOnServer(featuresToSave.delete),
            ]);

            this.deactivateEditingControls();
            this.removeCurrentEditingItem();

            if (this.display.item) {
                const layer = this.display.webmapStore.getLayer(
                    this.display.itemStore.getValue(this.display.item, "id")
                );

                if (layer) {
                    layer.reload();
                }
                if (this.selectedResourceId !== null) {
                    topic.publish(
                        "/webmap/feature-table/refresh",
                        this.selectedResourceId
                    );
                }
            }
            this.resolveRun(true);
        } catch (error) {
            console.error("Error saving changes:", error);
        }
    }

    private async patchFeaturesOnServer(
        features: FeatureToSave[]
    ): Promise<void> {
        if (
            this.selectedResourceId === null ||
            !features ||
            features.length < 1
        )
            return;

        await route("feature_layer.feature.collection", {
            id: this.selectedResourceId,
        }).patch({
            // @ts-expect-error TODO: define patch payload for feature_layer.feature.collection
            json: features,
        });
    }

    private async deleteFeaturesOnServer(
        features: FeatureToSave[]
    ): Promise<void> {
        if (
            this.selectedResourceId === null ||
            !features ||
            features.length < 1
        )
            return;

        await route("feature_layer.feature.collection", {
            id: this.selectedResourceId,
        }).delete({
            json: features,
        });
    }

    private removeCurrentEditingItem(): void {
        if (!this.editingItem) return;

        Object.values(this.editingItem.interactions).forEach((interaction) => {
            this.display.map.olMap.removeInteraction(interaction);
        });

        this.editingItem.features.forEach((feature) => {
            if (!feature.get("deleted")) {
                this.source.removeFeature(feature);
            }
        });

        this.store.delete(this.selectedResourceId!);
        this.setItemEditable(this.editingItem.nodeData, false);
        this.editingItem = undefined;
    }

    private undoChanges(): void {
        this.deactivateEditingControls();
        this.removeCurrentEditingItem();
        this.resolveRun(true);
    }

    private continueEditing(): void {
        if (this.editingItem) {
            this.setItemEditable(this.editingItem.nodeData, true);
        }
        this.resolveRun(true);
    }

    private resolveRun(value: boolean): void {
        if (this.resolve) {
            this.resolve(value);
            this.resolve = undefined;
        }
    }
}
