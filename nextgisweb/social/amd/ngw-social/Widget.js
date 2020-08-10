define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw/route",
    "ngw-pyramid/i18n!social",
    "ngw-pyramid/hbs-i18n",
    "ngw-file-upload/ImageUploader",
    // resource
    "dojo/text!./template/Widget.hbs",
    "ngw-pyramid/i18n!social",
    // template
    "dojox/layout/TableContainer",
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    route,
    i18n,
    hbsI18n,
    ImageUploader,
    template
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        serializePrefix: "social",
        title: i18n.gettext("Social"),

        postCreate: function () {
            this.inherited(arguments);
            this._restoreDefaultImage = false;
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
