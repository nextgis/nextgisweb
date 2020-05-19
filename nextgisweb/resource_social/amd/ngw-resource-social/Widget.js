define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/hbs-i18n",
    // resource
    "dojo/text!./template/Widget.hbs",
    "ngw-pyramid/i18n!resource-social",
    // template
    "dojox/layout/TableContainer",
    "ngw-file-upload/Uploader"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    hbsI18n,
    template,
    i18n
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        identity: "resource_social",
        title: i18n.gettext("Social"),

        postCreate: function () {
            this.inherited(arguments);

            this._restoreDefaultPreview = false;

            this.buttonRestore.on("click", function () {
                this._restoreDefaultPreview = true;

                // FIXME: there is no method for uploader reset
                this.wPreviewFile.destroy();
            }.bind(this));
        },

        serializeInMixin: function (data) {
            if (data[this.identity] === undefined) {
                data[this.identity] = {};
            }

            if (this._restoreDefaultPreview) {
                data[this.identity].preview_file_upload = null;
            } else if (this.wPreviewFile.data) {
                data[this.identity].preview_file_upload = this.wPreviewFile.data;
            }
        }
    });
});
