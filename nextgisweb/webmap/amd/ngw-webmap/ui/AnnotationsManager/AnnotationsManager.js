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
    "ngw/route",
    "ngw/utils/make-singleton",
    "ngw-webmap/layers/annotations/AnnotationFeature",
    "ngw-webmap/layers/annotations/AnnotationsLayer",
    "ngw-webmap/layers/annotations/AnnotationsEditableLayer",
    "ngw-webmap/ui/AnnotationsDialog/AnnotationsDialog",
    "@nextgisweb/pyramid/i18n!",
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
    route,
    MakeSingleton,
    AnnotationFeature,
    AnnotationsLayer,
    AnnotationsEditableLayer,
    AnnotationsDialog,
    i18n
) {
    var wkt = new ol.format.WKT();

    return MakeSingleton(
        declare("ngw-webmap.AnnotationsManager", [], {
            _store: null,
            _display: null,
            _annotationsLayer: null,
            _editableLayer: null,
            _annotationsDialog: null,
            _annotationPanel: null,

            _annotationsVisible: null,
            _popupsVisible: null,

            _editable: null,

            constructor: function (options) {
                if (!options.display || !options.panel) {
                    throw Error(
                        'AnnotationsManager: "display" and "panel" are required parameter for first call!'
                    );
                }
                this._display = options.display;
                this._annotationPanel = options.panel;

                this._annotationsVisible = this._display.config.annotations.default;
                this._popupsVisible = this._annotationsVisible;

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

            _loadAnnotations: function () {
                this._getAnnotationsCollection().then(
                    lang.hitch(this, function (annotations) {
                        this._annotationsLayer.fillAnnotations(annotations);
                        this._onAnnotationsVisibleChange(
                            this._annotationsVisible
                        );
                        this._onMessagesVisibleChange(this._popupsVisible);
                    })
                );
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
                    "webmap/annotations/geometry/changed",
                    lang.hitch(this, this._onChangeGeometry)
                );

                topic.subscribe(
                    "/annotations/visible",
                    lang.hitch(this, this._onAnnotationsVisibleChange)
                );
                topic.subscribe(
                    "/annotations/messages/visible",
                    lang.hitch(this, this._onMessagesVisibleChange)
                );
            },

            _onAnnotationsVisibleChange: function (toShow) {
                this._annotationsVisible = toShow;

                this._annotationsLayer.getLayer().set("visibility", toShow);

                if (toShow && this._popupsVisible) {
                    this._annotationsLayer.showPopups();
                }

                if (!toShow && this._popupsVisible) {
                    this._annotationsLayer.hidePopups();
                }
            },

            _onMessagesVisibleChange: function (toShow) {
                this._popupsVisible = toShow;

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
                var annFeature = new AnnotationFeature({
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

            _onChangeGeometry: function (annFeature, previousGeometry) {
                this._standby.show();
                this._updateAnnotation(annFeature).then(
                    lang.hitch(this, function () {
                        this._standby.hide();
                    }),
                    lang.hitch(this, function () {
                        annFeature.updateGeometry(previousGeometry);
                        this._standby.hide();
                    })
                );
            },

            _dialogResultHandle: function (result, dialog) {
                var annFeature = result.annFeature;

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

            createAnnotation: function (annFeature, newAnnotationInfo, dialog) {
                this._standby.show();
                this._createAnnotation(annFeature, newAnnotationInfo).then(
                    lang.hitch(this, function (resultSaved) {
                        var annId = resultSaved.id;
                        annFeature.setId(annId);
                        annFeature.updateAnnotationInfo(newAnnotationInfo);
                        if (this._popupsVisible)
                            this._annotationsLayer.showPopup(annFeature);
                        this._standby.hide();
                    }),
                    lang.hitch(this, function (err) {
                        this._standby.hide();
                        alert(
                            i18n.gettext("Error on the server:") +
                                " " +
                                err.response.text
                        );
                        dialog.showLastData();
                    })
                );
            },

            updateAnnotation: function (annFeature, newAnnotationInfo, dialog) {
                this._standby.show();
                this._updateAnnotation(annFeature, newAnnotationInfo).then(
                    lang.hitch(this, function () {
                        annFeature.updateAnnotationInfo(newAnnotationInfo);
                        annFeature.updatePopup();
                        this._standby.hide();
                    }),
                    lang.hitch(this, function (err) {
                        this._standby.hide();
                        alert(
                            i18n.gettext("Error on the server:") +
                                " " +
                                err.response.text
                        );
                        dialog.showLastData();
                    })
                );
            },

            deleteAnnotation: function (annFeature, dialog) {
                this._standby.show();
                this._deleteAnnotation(annFeature).then(
                    lang.hitch(this, function () {
                        this._annotationsLayer.removeAnnFeature(annFeature);
                        this._standby.hide();
                    }),
                    lang.hitch(this, function (err) {
                        this._standby.hide();
                        alert(
                            i18n.gettext("Error on the server:") +
                                " " +
                                err.response.text
                        );
                        dialog.showLastData();
                    })
                );
            },

            _createAnnotation: function (annFeature, newAnnotationInfo) {
                newAnnotationInfo.geom = wkt.writeGeometry(
                    annFeature.getFeature().getGeometry()
                );

                return xhr(
                    route.webmap.annotation.collection({
                        id: this._display.config.webmapId,
                    }),
                    {
                        method: "POST",
                        handleAs: "json",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        data: json.stringify(newAnnotationInfo),
                    }
                );
            },

            _getAnnotationsCollection: function () {
                return xhr(
                    route.webmap.annotation.collection({
                        id: this._display.config.webmapId,
                    }),
                    {
                        method: "GET",
                        handleAs: "json",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            },

            _deleteAnnotation: function (annFeature) {
                return xhr(
                    route.webmap.annotation.item({
                        id: this._display.config.webmapId,
                        annotation_id: annFeature.getId(),
                    }),
                    {
                        method: "DELETE",
                        handleAs: "json",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            },

            _updateAnnotation: function (annFeature, newAnnotationInfo) {
                return xhr(
                    route.webmap.annotation.item({
                        id: this._display.config.webmapId,
                        annotation_id: annFeature.getId(),
                    }),
                    {
                        method: "PUT",
                        handleAs: "json",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        data: json.stringify(newAnnotationInfo),
                    }
                );
            },
        })
    );
});
