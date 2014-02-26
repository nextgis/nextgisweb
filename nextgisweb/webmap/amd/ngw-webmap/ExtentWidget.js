/* globals define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-resource/ResourceStore",
    // resource
    "dojo/text!./template/ExtentWidget.html",
    // template
    "dijit/form/NumberTextBox",
    "dojox/layout/TableContainer",
    "ngw/form/PickerBox",
    "ngw-resource/ResourcePicker"
], function (
    declare,
    lang,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    ResourceStore,
    template
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: "Охват и закладки",
        templateString: template,

        buildRendering: function () {
            this.inherited(arguments);

            this.wBookmarkResource.set("store", new ResourceStore());
            this.wBookmarkResource.on("pick", lang.hitch(this, function () {
                this.bookmarkPicker.pick().then(lang.hitch(this, function (itm) {
                    this.wBookmarkResource.set("value", itm.id);
                })).otherwise(console.error);
            }));
        },

        serializeInMixin: function (data) {
            if (data.webmap === undefined) { data.webmap = {}; }
            var value = data.webmap;

            value.extent_left = this.wExtentLeft.get("value");
            value.extent_right = this.wExtentRight.get("value");
            value.extent_top = this.wExtentTop.get("value");
            value.extent_bottom = this.wExtentBottom.get("value");

            var brid = this.wBookmarkResource.get("value");
            value.bookmark_resource = ( brid !== null) ? { id: brid } : null;
        },

        deserializeInMixin: function (data) {
            var value = data.webmap;
            this.wExtentLeft.set("value", value.extent_left);
            this.wExtentRight.set("value", value.extent_right);
            this.wExtentTop.set("value", value.extent_top);
            this.wExtentBottom.set("value", value.extent_bottom);

            if (value.bookmark_resource) {
                this.wBookmarkResource.set("value", value.bookmark_resource.id);
            }
        }
    });
});