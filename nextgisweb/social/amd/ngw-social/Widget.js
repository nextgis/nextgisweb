define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw/route",
    "@nextgisweb/pyramid/i18n!",
    "ngw-file-upload/ImageUploader",
    // resource
    "dojo/text!./template/Widget.hbs",
    // template
    "dojox/layout/TableContainer",
    "dijit/form/ValidationTextBox"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    route,
    i18n,
    ImageUploader,
    template
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        serializePrefix: "social",
        title: i18n.gettext("Social"),

        postCreate: function () {
            this.inherited(arguments);
            this._restoreDefaultImage = false;
        },

        startup: function () {
            this.inherited(arguments);
            this.wPreviewFile.setAccept('image/png,image/jpeg');
        },

        deserializeInMixin: function (data) {
            this.inherited(arguments);
            if (data[this.serializePrefix].preview_image_exists) {
                var url = route.resource.preview({id: data.resource.id});
                this.wPreviewFile.setImage(url);
            }
        },

        serializeInMixin: function (data) {
            if (data[this.serializePrefix] === undefined) {
                data[this.serializePrefix] = {};
            }

            var image = this.wPreviewFile.get('value');
            if (image !== undefined) {
                data[this.serializePrefix].preview_file_upload = image;
            }

            var description = this.wPreviewDescription.get("value");
            if (description === '') {
                data[this.serializePrefix].preview_description = null;
            }
        }
    });
});
