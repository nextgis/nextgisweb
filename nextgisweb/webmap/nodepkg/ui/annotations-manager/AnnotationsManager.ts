import { reaction } from "mobx";
import type Feature from "ol/Feature";
import { WKT } from "ol/format";

import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import topic from "@nextgisweb/webmap/compat/topic";
import type { Display } from "@nextgisweb/webmap/display";
import type { AnnotationVisibleMode } from "@nextgisweb/webmap/store/annotations/AnnotationsStore";

import { AnnotationFeature } from "../../layer/annotations/AnnotationFeature";
import type { AnnotationInfo } from "../../layer/annotations/AnnotationFeature";
import { AnnotationsEditableLayer } from "../../layer/annotations/AnnotationsEditableLayer";
import type { AnnotationGeometryType } from "../../layer/annotations/AnnotationsEditableLayer";
import { AnnotationsLayer } from "../../layer/annotations/AnnotationsLayer";
import type { AccessFilter } from "../../layer/annotations/AnnotationsLayer";
import { AnnotationsDialog } from "../annotation-dialog";
import type { DialogResult } from "../annotation-dialog/AnnotationDialog";

interface ManagerOptions {
    display: Display;
    initialAnnotVisible?: AnnotationVisibleMode;
}

function annotationVisible(annot: AnnotationVisibleMode) {
    return annot === "yes" || annot === "messages";
}

export class AnnotationsManager {
    private static instance: AnnotationsManager | null = null;

    private _display!: Display;
    private _annotationsLayer!: AnnotationsLayer;
    private _editableLayer!: AnnotationsEditableLayer;
    private _annotationsDialog!: AnnotationsDialog;
    private _annotationsVisibleState!: AnnotationVisibleMode;
    private _editable!: boolean;

    constructor({ display, initialAnnotVisible }: ManagerOptions) {
        if (AnnotationsManager.instance) {
            return AnnotationsManager.instance;
        }
        if (!display) {
            throw new Error(
                'AnnotationsManager: "display" required parameter for first call!'
            );
        }

        this._display = display;
        this._annotationsVisibleState = initialAnnotVisible ?? "no";
        this._annotationsDialog = new AnnotationsDialog();
        this._editable = this._display.config.annotations.scope.write;

        this._display.layersDeferred.then(() => this._init());

        reaction(
            () => display.webmapStore.layers,
            () => {
                if (this._annotationsLayer) {
                    this._annotationsLayer.setZIndex(
                        Object.keys(display.webmapStore.layers).length * 2 // Multiply by two for insurance
                    );
                }
            }
        );

        AnnotationsManager.instance = this;
    }

    async createAnnotation(
        annFeature: AnnotationFeature,
        newAnnotationInfo: AnnotationInfo
    ): Promise<void> {
        try {
            const annotationInfo = await this._createAnnotation(
                annFeature,
                newAnnotationInfo
            );
            annFeature.updateAnnotationInfo(annotationInfo);
            if (this._isMessagesVisible()) {
                this._annotationsLayer.showPopup(annFeature);
            }
            this._annotationsLayer.redrawFilter();
        } catch (err) {
            errorModal(err);
            throw err;
        }
    }

    async updateAnnotation(
        annFeature: AnnotationFeature,
        newAnnotationInfo: AnnotationInfo
    ): Promise<void> {
        try {
            const annotationInfo = await this._updateAnnotation(
                annFeature,
                newAnnotationInfo
            );
            annFeature.updateAnnotationInfo(annotationInfo);
            this._annotationsLayer.redrawFilter();
        } catch (err) {
            errorModal(err);
            throw err;
        }
    }

    async deleteAnnotation(annFeature: AnnotationFeature): Promise<void> {
        try {
            await this._deleteAnnotation(annFeature);
            this._annotationsLayer.removeAnnFeature(annFeature);
        } catch (err) {
            errorModal(err);
            throw err;
        }
    }

    private _init(): void {
        this._buildAnnotationsLayers();
        this._loadAnnotations();
        this._bindEvents();
    }

    private _buildAnnotationsLayers(): void {
        this._annotationsLayer = new AnnotationsLayer({
            visible: annotationVisible(this._annotationsVisibleState),
        });
        this._annotationsLayer.addToMap(this._display.map);
        this._editableLayer = new AnnotationsEditableLayer(this._display.map);
    }

    private async _loadAnnotations(): Promise<void> {
        try {
            const annotations = await this._getAnnotationsCollection();
            this._annotationsLayer.fillAnnotations(annotations);
            this._onAnnotationsVisibleChange(this._annotationsVisibleState);
        } catch (err) {
            errorModal(err);
        }
    }

    private _bindEvents(): void {
        topic.subscribe(
            "webmap/annotations/add/activate",
            this._onAddModeActivated.bind(this)
        );
        topic.subscribe(
            "webmap/annotations/add/deactivate",
            this._onAddModeDeactivated.bind(this)
        );
        topic.subscribe(
            "webmap/annotations/layer/feature/created",
            this._onCreateOlFeature.bind(this)
        );
        topic.subscribe(
            "webmap/annotations/change/",
            this._onChangeAnnotation.bind(this)
        );
        topic.subscribe(
            "webmap/annotations/change/geometryType",
            this._onChangeGeometryType.bind(this)
        );
        topic.subscribe(
            "/annotations/visible",
            this._onAnnotationsVisibleChange.bind(this)
        );
        topic.subscribe(
            "webmap/annotations/filter/changed",
            this._onFilterChanged.bind(this)
        );
    }

    private _onFilterChanged(filter: AccessFilter): void {
        this._annotationsLayer.applyFilter(filter);
    }

    private _onAnnotationsVisibleChange(
        annotVisibleState: AnnotationVisibleMode
    ): void {
        this._annotationsVisibleState = annotVisibleState;

        const annotVisible = annotationVisible(annotVisibleState);
        this._annotationsLayer.getLayer().setVisibility(annotVisible);

        if (this._isMessagesVisible()) {
            this._annotationsLayer.showPopups();
        } else {
            this._annotationsLayer.hidePopups();
        }
    }

    private _onAddModeActivated(geometryType: AnnotationGeometryType): void {
        if (this._editable) {
            document.body.classList.add("annotations-edit");
        }
        this._editableLayer.activate(this._annotationsLayer, geometryType);
    }

    private _onAddModeDeactivated(): void {
        if (this._editable) {
            document.body.classList.remove("annotations-edit");
        }
        this._editableLayer.deactivate();
    }

    private _onCreateOlFeature(olFeature: Feature): void {
        const annFeature = new AnnotationFeature({
            feature: olFeature,
        });

        this._annotationsDialog.showForEdit(annFeature).then((result) => {
            this._dialogResultHandle(result);
        });
    }

    private _onChangeAnnotation(annFeature: AnnotationFeature): void {
        this._annotationsDialog.showForEdit(annFeature).then((result) => {
            this._dialogResultHandle(result);
        });
    }

    private _onChangeGeometryType(geometryType: AnnotationGeometryType): void {
        this._editableLayer.changeGeometryType(geometryType);
    }

    private _isMessagesVisible(): boolean {
        return this._annotationsVisibleState === "messages";
    }

    private async _dialogResultHandle(result: DialogResult): Promise<void> {
        const annFeature = result.annFeature;

        if (result.action === "save") {
            if (annFeature.isNew()) {
                await this.createAnnotation(annFeature, result.newData);
            } else {
                await this.updateAnnotation(annFeature, result.newData);
            }
        }

        if (result.action === "undo" && annFeature.isNew()) {
            this._annotationsLayer.removeAnnFeature(annFeature);
        }

        if (result.action === "delete") {
            await this.deleteAnnotation(annFeature);
        }
    }

    private async _createAnnotation(
        annFeature: AnnotationFeature,
        newAnnotationInfo: AnnotationInfo
    ): Promise<AnnotationInfo> {
        const wkt = new WKT();
        const geometry = annFeature.getFeature()?.getGeometry();

        if (!geometry) {
            throw new Error("There is no geometry in annotation feature");
        }

        newAnnotationInfo.geom = wkt.writeGeometry(geometry);

        const createInfo = await route("webmap.annotation.collection", {
            id: this._display.config.webmapId,
        }).post({
            json: newAnnotationInfo,
        });

        return this._getAnnotation(
            this._display.config.webmapId,
            createInfo.id
        );
    }

    private async _getAnnotation(
        webmapId: number,
        annotationId: number
    ): Promise<AnnotationInfo> {
        return route("webmap.annotation.item", {
            id: webmapId,
            annotation_id: annotationId,
        }).get();
    }

    private async _getAnnotationsCollection(): Promise<AnnotationInfo[]> {
        return route("webmap.annotation.collection", {
            id: this._display.config.webmapId,
        }).get();
    }

    private async _deleteAnnotation(
        annFeature: AnnotationFeature
    ): Promise<void> {
        const annotationId = annFeature.getId();
        if (annotationId !== undefined) {
            await route("webmap.annotation.item", {
                id: this._display.config.webmapId,
                annotation_id: Number(annotationId),
            }).delete();
        }
    }

    private async _updateAnnotation(
        annFeature: AnnotationFeature,
        newAnnotationInfo: AnnotationInfo
    ): Promise<AnnotationInfo> {
        const annotationId = annFeature.getId();
        if (annotationId === undefined) {
            throw new Error("The annotation feature has no ID");
        }
        const updateInfo = await route("webmap.annotation.item", {
            id: this._display.config.webmapId,
            annotation_id: Number(annotationId),
        }).put({
            json: newAnnotationInfo,
        });

        return this._getAnnotation(
            this._display.config.webmapId,
            updateInfo.id
        );
    }
}
