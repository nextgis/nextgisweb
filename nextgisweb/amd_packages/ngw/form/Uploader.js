define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Uploader.html",
    "dojox/form/Uploader",
    "dojox/form/uploader/plugins/Flash"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    Uploader,
    FlashUploader
) {
    // Uploader AMD workaround
    Uploader = dojox.form.Uploader;

    return declare("ngw.form.Uploader", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        constructor: function () {
            this.uploading = false;
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
            this.uploading = true;
            this.data = undefined;
            this.fileInfo.innerHTML = "Идет загрузка...";
        },

        uploadComplete: function (data) {
            this.uploading = false;
            this.data = data;
            this.fileInfo.innerHTML = data.name + " (" + data.size + " байт)";
        },

        uploadError: function () {
            this.uploading = false;
            this.data = undefined;
            this.fileInfo.innerHTML = "Не удалось загрузить файл!";
        },

        _getValueAttr: function () {
            return this.data;
        }
    });
});