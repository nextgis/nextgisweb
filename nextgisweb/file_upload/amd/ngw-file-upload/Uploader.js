/*global define, dojox */
define([
    "dojo/_base/declare",
    "dojo/Deferred",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!file_upload",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/Uploader.html",
    "dojox/form/Uploader",
    "ngw/route"
], function (
    declare,
    Deferred,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    i18n,
    hbsI18n,
    template,
    Uploader,
    route
) {
    // Uploader AMD workaround
    Uploader = dojox.form.Uploader;

    function readableFileSize(size) {
        var units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        var i = 0;
        while (size >= 1024) {
            size /= 1024;
            ++i;
        }
        return size.toFixed(1) + " " + units[i];
    }

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        showProgressInDocTitle: true,

        constructor: function () {
            this.upload_promise = undefined;
            this.docTitle = document.title;
        },

        postCreate: function () {
            this.uploaderWidget = new Uploader({
                label: i18n.gettext("Select"),
                multiple: false,
                uploadOnSelect: true,
                url: route.file_upload.upload(),
                name: "file"
            }).placeAt(this.fileUploader);

            var widget = this;
            this.uploaderWidget.on("begin", function () { widget.uploadBegin(); });
            this.uploaderWidget.on("progress", function (evt) { widget.uploadProgress(evt); });
            this.uploaderWidget.on("complete", function (data) { widget.uploadComplete(data); });
            this.uploaderWidget.on("error", function () { widget.uploadError(); });

            this.fileInfo.innerHTML = i18n.gettext("File is not selected!");
        },

        startup: function () {
            this.inherited(arguments);
            this.uploaderWidget.startup();
        },

        uploadBegin: function () {
            this.upload_promise = new Deferred();
            this.uploading = true;
            this.data = undefined;
            this.fileInfo.innerHTML = i18n.gettext("Uploading...");
        },

        uploadProgress: function (evt) {
            if (evt.type === "progress") {
                this.fileInfo.innerHTML = evt.percent + i18n.gettext(" uploaded...");

                if (this.showProgressInDocTitle) {
                    document.title = evt.percent + " | " + this.docTitle;
                }
            }
        },

        uploadComplete: function (data) {
            this.upload_promise.resolve(data);
            this.uploading = false;

            // Поскольку данный виджет используется для загрузки
            // отдельных файлов, то извлекаем первый элемент из списка
            this.data = data.upload_meta[0];
            this.fileInfo.innerHTML = this.data.name + " (" + readableFileSize(this.data.size) + ")";
        },

        uploadError: function (error) {
            this.upload_promise.reject(error);
            this.uploading = false;
            this.data = undefined;
            this.fileInfo.innerHTML = i18n.gettext("Could not load file!");
        },

        _getValueAttr: function () {
            var result;

            if (this.upload_promise === undefined || this.upload_promise.isResolved()) {
                result = this.data;
            } else {
                result = this.upload_promise;
            }

            return result;
        }
    });
});
