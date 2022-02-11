define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/topic",
    "dojo/dom-class",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/store/JsonRest",
    "dojo/store/Memory",
    "dojo/promise/all",
    "dojox/html/entities",
    "dojox/widget/Standby",
    "openlayers/ol",
    "@nextgisweb/pyramid/api",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "ngw-pyramid/make-singleton",
    "ngw-webmap/layers/annotations/AnnotationFeature",
    "ngw-webmap/layers/annotations/AnnotationsLayer",
    "ngw-webmap/layers/annotations/AnnotationsEditableLayer",
    "ngw-webmap/ui/AnnotationsDialog/AnnotationsDialog",
], function (
    declare,
    lang,
    array,
    topic,
    domClass,
    xhr,
    json,
    JsonRest,
    Memory,
    all,
    htmlEntities,
    Standby,
    ol,
    api,
    ErrorDialog,
    MakeSingleton,
    AnnotationFeature,
    AnnotationsLayer,
    AnnotationsEditableLayer,
    AnnotationsDialog
) {
    var wkt = new ol.format.WKT();
    const { route } = api;

    return MakeSingleton(
        declare("ngw-webmap.AnnotationsManager", [], {
            _store: null,
            _display: null,
            _annotationsLayer: null,
            _editableLayer: null,
            _annotationsDialog: null,
            _annotationPanel: null,

            _annotationsVisible: null,
            _messagesVisible: null,

            _editable: null,

            constructor: function (options) {
                if (!options.display || !options.panel) {
                    throw Error(
                        'AnnotationsManager: "display" and "panel" are required parameter for first call!'
                    );
                }
                this._display = options.display;
                this._annotationPanel = options.panel;

                this._annotationsVisible =
                    this._display.config.annotations.default;
                this._messagesVisible = this._annotationsVisible;

                this._annotationsDialog = new AnnotationsDialog({
                    annotationsManager: this,
                });
                this._editable = this._display.config.annotations.scope.write;

                this._display._layersDeferred.then(
                    lang.hitch(this, this._init)
                );
            },

            _init: function () {
                this._buildAnnotationsLayers();
                this._loadAnnotations();
                this._buildStandby();
                this._bindEvents();
            },

            _buildStandby: function () {
                var standby = new Standby({
                    target: "webmap-wrapper",
                    color: "#e5eef7",
                });
                document.body.appendChild(standby.domNode);
                standby.startup();
                this._standby = standby;
            },

            _buildAnnotationsLayers: function () {
                this._annotationsLayer = new AnnotationsLayer();
                this._annotationsLayer.addToMap(this._display.map);
                this._editableLayer = new AnnotationsEditableLayer(
                    this._display.map
                );
            },

            _loadAnnotations: async function () {
                try {
                    const annotations = await this._getAnnotationsCollection();
                    this._annotationsLayer.fillAnnotations(annotations);
                    this._onAnnotationsVisibleChange(this._annotationsVisible);
                    this._onMessagesVisibleChange(this._messagesVisible);
                } catch (err) {
                    new ErrorDialog(err).show();
                }
            },

            _bindEvents: function () {
                topic.subscribe(
                    "webmap/annotations/add/activate",
                    lang.hitch(this, this._onAddModeActivated)
                );
                topic.subscribe(
                    "webmap/annotations/add/deactivate",
                    lang.hitch(this, this._onAddModeDeactivated)
                );

                topic.subscribe(
                    "webmap/annotations/layer/feature/created",
                    lang.hitch(this, this._onCreateOlFeature)
                );
                topic.subscribe(
                    "webmap/annotations/change/",
                    lang.hitch(this, this._onChangeAnnotation)
                );

                topic.subscribe(
                    "/annotations/visible",
                    lang.hitch(this, this._onAnnotationsVisibleChange)
                );
                topic.subscribe(
                    "/annotations/messages/visible",
                    lang.hitch(this, this._onMessagesVisibleChange)
                );

                topic.subscribe(
                    "webmap/annotations/filter/changed",
                    lang.hitch(this, this._onFilterChanged)
                );
            },

            _onFilterChanged: function (filter) {
                this._annotationsLayer.applyFilter(filter);
            },

            _onAnnotationsVisibleChange: function (toShow) {
                this._annotationsVisible = toShow;

                this._annotationsLayer.getLayer().set("visibility", toShow);

                if (toShow && this._messagesVisible) {
                    this._annotationsLayer.showPopups();
                }

                if (!toShow && this._messagesVisible) {
                    this._annotationsLayer.hidePopups();
                }
            },

            _onMessagesVisibleChange: function (toShow) {
                this._messagesVisible = toShow;

                if (toShow) {
                    this._annotationsLayer.showPopups();
                } else {
                    this._annotationsLayer.hidePopups();
                }
            },

            _onAddModeActivated: function () {
                if (this._editable)
                    domClass.add(document.body, "annotations-edit");
                this._editableLayer.activate(this._annotationsLayer);
                this._annotationPanel.setAnnotationsShow(true);
                this._annotationPanel.setMessagesShow(true);
            },

            _onAddModeDeactivated: function () {
                if (this._editable)
                    domClass.remove(document.body, "annotations-edit");
                this._editableLayer.deactivate();
            },

            _onCreateOlFeature: function (olFeature) {
                const annFeature = new AnnotationFeature({
                    feature: olFeature,
                });

                this._annotationsDialog
                    .showForEdit(annFeature)
                    .then(lang.hitch(this, this._dialogResultHandle));
            },

            _onChangeAnnotation: function (annFeature) {
                this._annotationsDialog
                    .showForEdit(annFeature)
                    .then(lang.hitch(this, this._dialogResultHandle));
            },

            _dialogResultHandle: function (result, dialog) {
                const annFeature = result.annFeature;

                if (result.action === "save") {
                    if (annFeature.isNew()) {
                        this.createAnnotation(
                            annFeature,
                            result.newData,
                            dialog
                        );
                    } else {
                        this.updateAnnotation(
                            annFeature,
                            result.newData,
                            dialog
                        );
                    }
                }

                if (result.action === "undo") {
                    if (annFeature.isNew()) {
                        this._annotationsLayer.removeAnnFeature(annFeature);
                    }
                }

                if (result.action === "delete") {
                    this.deleteAnnotation(annFeature, dialog);
                }
            },

            createAnnotation: async function (
                annFeature,
                newAnnotationInfo,
                dialog
            ) {
                this._standby.show();
                try {
                    const annotationInfo = await this._createAnnotation(
                        annFeature,
                        newAnnotationInfo
                    );
                    annFeature.updateAnnotationInfo(annotationInfo);
                    if (this._messagesVisible)
                        this._annotationsLayer.showPopup(annFeature);
                } catch (err) {
                    new ErrorDialog(err).show();
                    dialog.showLastData();
                } finally {
                    this._standby.hide();
                }
            },

            updateAnnotation: async function (
                annFeature,
                newAnnotationInfo,
                dialog
            ) {
                this._standby.show();
                try {
                    const annotationInfo = await this._updateAnnotation(annFeature, newAnnotationInfo);
                    annFeature.updateAnnotationInfo(annotationInfo);
                } catch (err) {
                    new ErrorDialog(err).show();
                    dialog.showLastData();
                } finally {
                    this._standby.hide();
                }
            },

            deleteAnnotation: async function (annFeature, dialog) {
                this._standby.show();
                try {
                    await this._deleteAnnotation(annFeature);
                    this._annotationsLayer.removeAnnFeature(annFeature);
                } catch (err) {
                    new ErrorDialog(err).show();
                    dialog.showLastData();
                } finally {
                    this._standby.hide();
                }
            },

            _createAnnotation: async function (annFeature, newAnnotationInfo) {
                newAnnotationInfo.geom = wkt.writeGeometry(
                    annFeature.getFeature().getGeometry()
                );

                const createInfo = await route(
                    "webmap.annotation.collection",
                    this._display.config.webmapId
                )
                    .post({
                        json: newAnnotationInfo,
                    })
                    .then((d) => d);

                return this._getAnnotation(
                    this._display.config.webmapId,
                    createInfo.id
                );
            },

            _getAnnotation: async function (webmapId, annotationId) {
                return await route(
                    "webmap.annotation.item",
                    webmapId,
                    annotationId
                )
                    .get()
                    .then((d) => d);
            },

            _getAnnotationsCollection: async function () {
                return route(
                    "webmap.annotation.collection",
                    this._display.config.webmapId
                )
                    .get()
                    .then((d) => d);
            },

            _deleteAnnotation: async function (annFeature) {
                return route(
                    "webmap.annotation.item",
                    this._display.config.webmapId,
                    annFeature.getId()
                )
                    .delete()
                    .then((d) => d);
            },

            _updateAnnotation: async function (annFeature, newAnnotationInfo) {
                const updateInfo = await route(
                    "webmap.annotation.item",
                    this._display.config.webmapId,
                    annFeature.getId()
                )
                    .put({
                        json: newAnnotationInfo,
                    })
                    .then((d) => d);

                return this._getAnnotation(
                    this._display.config.webmapId,
                    updateInfo.id
                );
            },
        })
    );
});
