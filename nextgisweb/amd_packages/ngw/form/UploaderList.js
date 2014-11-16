define([
    "dojo/_base/declare",
    "dojo/Deferred",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/UploaderList.html",
    "dojox/form/Uploader",
    "dojox/form/uploader/FileList",
    "ngw/route",
    // css
    "xstyle/css!./resources/UploaderList.css"
], function (
    declare,
    Deferred,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    Uploader,
    FileList,
    route
) {
    // TODO: Убрать после обновления Dojo до 1.9
    Uploader = dojox.form.Uploader;

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        postCreate: function() {
            this.uploaderWidget = new Uploader({
                label: "Выбрать",
                multiple: true,
                uploadOnSelect: true,
                url: route.file_upload.upload(),
                name: "file"
            }).placeAt(this.fileUploader);

            this.fileListWidget = new FileList({
                uploader: this.uploaderWidget,
                headerIndex: "№",
                headerFilename: "Имя файла",
                headerType: "Тип",
                headerFilesize: "Размер"
            }).placeAt(this.fileList);

            var widget = this;
            this.uploaderWidget.on("begin", function () { widget.uploadBegin(); });
            this.uploaderWidget.on("progress", function (evt) { widget.uploadProgress(evt); });
            this.uploaderWidget.on("complete", function (data) { widget.uploadComplete(data); });
            this.uploaderWidget.on("error", function () { widget.uploaderError(); });
        },

        startup: function () {
            this.inherited(arguments);
            this.uploaderWidget.startup();
            this.fileListWidget.startup();
        },

        uploadBegin: function () {
            this.upload_promise = new Deferred();
            this.uploading = true;
            this.data = undefined;
        },

        uploadProgress: function (evt) {},

        uploadComplete: function (data) {
            this.upload_promise.resolve(data);
            this.uploading = false;
            this.data = data;
        },

        uploadError: function (error) {
            this.upload_promise.reject(error);
            this.uploading = false;
            this.data = undefined;
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

