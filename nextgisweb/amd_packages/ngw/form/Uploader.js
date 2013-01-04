define([
    "dojo/_base/declare",
    "dojo/Deferred",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Uploader.html",
    "dojox/form/Uploader",
    "dojox/form/uploader/plugins/Flash"
], function (
    declare,
    Deferred,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    Uploader,
    FlashUploader
) {
    // Uploader AMD workaround
    Uploader = dojox.form.Uploader;

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        constructor: function () {
            this.upload_promise = undefined;
        },

        postCreate: function () {
            this.uploaderWidget = new Uploader({
                label: "Выбрать",
                multiple: false,
                uploadOnSelect: true,
                url: application_url + '/file_upload/upload',
                name: "file"
            }).placeAt(this.fileUploader);

            var widget = this;
            this.uploaderWidget.on("begin", function() { widget.uploadBegin() });
            this.uploaderWidget.on("complete", function(data) { widget.uploadComplete(data) });
            this.uploaderWidget.on("error", function () { widget.uploaderError() });

            this.fileInfo.innerHTML = "Файл не выбран!";
        },

        startup: function () {
            this.inherited(arguments);
            this.uploaderWidget.startup();
        },

        uploadBegin: function () {
            this.upload_promise = new Deferred();
            this.uploading = true;
            this.data = undefined;
            this.fileInfo.innerHTML = "Идет загрузка...";
        },

        uploadComplete: function (data) {
            this.upload_promise.resolve(data);
            this.uploading = false;
            this.data = data;
            this.fileInfo.innerHTML = data.name + " (" + data.size + " байт)";
        },

        uploadError: function (error) {
            this.upload_promise.reject(error);
            this.uploading = false;
            this.data = undefined;
            this.fileInfo.innerHTML = "Не удалось загрузить файл!";
        },

        _getValueAttr: function () {
            if (this.upload_promise == undefined || this.upload_promise.isResolved()) {
                return this.data
            } else {
                return this.upload_promise
            };
        }
    });
});