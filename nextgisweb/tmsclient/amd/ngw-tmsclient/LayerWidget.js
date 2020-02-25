/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!tmsclient",
    "ngw-pyramid/hbs-i18n",
    // resource
    "dojo/text!./template/LayerWidget.hbs",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/NumberTextBox",
    "dojox/layout/TableContainer",
    "ngw-spatial-ref-sys/SRSSelect",
    "ngw-resource/ResourceBox",
], function (
    declare,
    lang,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    i18n,
    hbsI18n,
    template
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        title: i18n.gettext("TMS layer"),
        serializePrefix: "tmsclient_layer",

        serializeInMixin: function (data) {
            if (data[this.serializePrefix] === undefined) { data[this.serializePrefix] = {}; }
            var value = data[this.serializePrefix];

            value.connection = this.wConnection.get("value");
            value.srs = {id: this.wSRS.get("value")};
            value.tilesize = this.wTileSize.get("value");
            value.layer_name = this.wLayerName.get("value");
            value.maxzoom = this.wMaxZoom.get("value");
            value.extent_left = this.wExtentLeft.get("value");
            value.extent_right = this.wExtentRight.get("value");
            value.extent_bottom = this.wExtentBottom.get("value");
            value.extent_top = this.wExtentTop.get("value");
        },

        deserializeInMixin: function (data) {
            var value = data[this.serializePrefix];
            if (value === undefined) { return; }

            this.wConnection.set("value", value.connection);
            this.wSRS.set("value", value.srs.id);
            this.wLayerName.set("value", value.layer_name);
            this.wTileSize.set("value", value.tilesize);
            this.wMaxZoom.set("value", value.maxzoom);
            this.wExtentLeft.set("value", value.extent_left);
            this.wExtentRight.set("value", value.extent_right);
            this.wExtentBottom.set("value", value.extent_bottom);
            this.wExtentTop.set("value", value.extent_top);
        }
    });
});
