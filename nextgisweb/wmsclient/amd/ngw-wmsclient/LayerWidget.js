/* global define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dojo/when",
    "dojo/on",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "put-selector/put",
    "ngw-resource/serialize",
    "ngw-resource/ResourceStore",
    // resource
    "dojo/text!./template/LayerWidget.html",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/ComboBox",
    "dojox/layout/TableContainer",
    "ngw/form/PickerBox",
    "ngw/form/SpatialRefSysSelect",
    "ngw-resource/ResourcePicker"
], function (
    declare,
    array,
    lang,
    Deferred,
    when,
    on,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    put,
    serialize,
    ResourceStore,
    template
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: "WMS",
        templateString: template,
        serializePrefix: "wmsclient_layer",

        postCreate: function () {
            this.inherited(arguments);

            var fmtstore = this.wImgFormat.get("store");
            array.forEach(this.imgformat, function (i) {
                fmtstore.add({id: i, name: i});
            }, this);

            var table = put(this.wLayerSelect.containerNode,
                "table.data[width=100%] tr th $ < th $ <<", "Имя", "Описание");

            array.forEach(this.wmslayers, function (i) {
                var node = put(table, "tr td $ < td a.action $ ", i.id, i.title);
                on(node, "click", lang.hitch(this, this.toggleLayer, i.id));
            }, this);
        },
        
        buildRendering: function () {
            this.inherited(arguments);

            this.wConnection.set("store", new ResourceStore());
            this.wConnection.on("pick", lang.hitch(this, function () {
                this.connectionPicker.pick().then(lang.hitch(this, function (itm) {
                    this.wConnection.set("value", itm.id);
                })).otherwise(console.error);
            }));
        },

        toggleLayer: function (id) {
            var arr = this.wWMSLayers.get("value").split(/,\s*/);
            if (arr.length === 1 && arr[0] === "") {
                arr = [];
            }
            var idx = arr.indexOf(id);
            if (idx == -1) {
                arr.push(id);
            } else {
                arr.splice(idx, 1);
            }
            this.wWMSLayers.set("value", arr.join(", "));
        },

        _setValueAttr: function (value) {
            this.wWMSLayers.set("value", value.wmslayers.split(/,\s*/).join(", "));
            this.wImgFormat.set("value", value.imgformat);
        },

        serializeInMixin: function (data) {
            if (data[this.serializePrefix] === undefined) { data[this.serializePrefix] = {}; }
            var value = data[this.serializePrefix];

            value.connection = {id: this.wConnection.get("value")};
            value.srs = {id: this.wSRS.get("value")};
            value.wmslayers = this.wWMSLayers.get("value").split(/,\s*/).join();
            value.imgformat = this.wImgFormat.get("value");
        },

        deserializeInMixin: function (data) {
            var value = data[this.serializePrefix];
            if (value === undefined) { return; }

            this.wConnection.set("value", value.connection.id);
            this.wSRS.set("value", value.srs.id);
            this.wWMSLayers.set("value", value.wmslayers.split(/,\s*/).join(", "));
            this.wImgFormat.set("value", value.imgformat);
        }
    });
});