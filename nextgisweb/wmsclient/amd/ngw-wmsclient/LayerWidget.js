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
    ResourceStore,
    template
) {
    var IDENTITY = 'wmsclient_layer';

    return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        title: "WMS",

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

        validateWidget: function () {
            var result = { isValid: true, error: [] };

            array.forEach([this.wWMSLayers, this.wImgFormat], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();

                // если есть ошибки, фиксируем их
                if ( !subw.isValid() ) { result.isValid = false; }
            });

            return result;
        },

        serialize: function (data) {
            if (data[IDENTITY] === undefined) { data[IDENTITY] = {}; }
            var value = data[IDENTITY];

            value.connection = {id: this.wConnection.get("value")};
            value.srs = {id: this.wSRS.get("value")};
            value.wmslayers = this.wWMSLayers.get("value").split(/,\s*/).join();
            value.imgformat = this.wImgFormat.get("value");
        },

        deserialize: function (data) {
            var value = data[IDENTITY];
            if (value === undefined) { return; }

            this.wConnection.set("value", value.connection.id);
            this.wSRS.set("value", value.srs.id);
            this.wWMSLayers.set("value", value.wmslayers.split(/,\s*/).join(", "));
            this.wImgFormat.set("value", value.imgformat);
        }
    });
});