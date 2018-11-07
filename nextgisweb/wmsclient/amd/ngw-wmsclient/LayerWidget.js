/* global define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/aspect",
    "dojo/request/xhr",
    "dojo/dom-construct",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "put-selector/put",
    "ngw/route",
    "ngw-pyramid/i18n!wmsclient",
    "ngw-pyramid/hbs-i18n",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./template/LayerWidget.hbs",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/ComboBox",
    "dijit/layout/BorderContainer",
    "dojox/layout/TableContainer",
    "ngw-spatial-ref-sys/SpatialRefSysSelect",
    "ngw-resource/ResourceBox",
    "ngw-resource/ResourcePicker"
], function (
    declare,
    array,
    lang,
    on,
    aspect,
    xhr,
    domConstruct,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    put,
    route,
    i18n,
    i18nHbs,
    serialize,
    template
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: i18n.gettext("WMS layer"),
        templateString: i18nHbs(template, i18n),
        serializePrefix: "wmsclient_layer",

        postCreate: function () {
            this.inherited(arguments);

            aspect.after(this.wConnection, "set", lang.hitch(this, function (name, value) {
                if (name == "value") { this.loadCapCache(value); }
            }), true);
        },

        loadCapCache: function (connection) {
            var widget = this,
                fmtStore = this.wImgFormat.store;

            var render = function (capdata) {
                fmtStore.query().forEach(function (i) { fmtStore.remove(i.id); });
                array.forEach(capdata.formats, function (i) {
                    widget.wImgFormat.get("store").add({id: i, name: i});
                });

                domConstruct.empty(widget.wLayerSelect.containerNode);

                var table = put(widget.wLayerSelect.containerNode,
                    "table.pure-table.pure-table-horizontal.pure-table-horizontal--s[width=100%]");

                array.forEach(capdata.layers, function (i) {
                    var node = put(table, "tr td $ < td a.action $ ", i.id, i.title);
                    on(node, "click", lang.hitch(widget, widget.toggleLayer, i.id));
                }, this);
            };

            if (connection !== null) {
                this.wConnection.store.get(connection.id).then(function (data) {
                    xhr.get(route.resource.item(data.resource.id),{
                        handleAs: "json"
                    }).then(function (data) {
                        render(data.wmsclient_connection.capcache);
                    });
                });
            }
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

        serializeInMixin: function (data) {
            if (data[this.serializePrefix] === undefined) { data[this.serializePrefix] = {}; }
            var value = data[this.serializePrefix];

            value.connection = this.wConnection.get("value");
            value.srs = {id: this.wSRS.get("value")};
            value.wmslayers = this.wWMSLayers.get("value").split(/,\s*/).join();
            value.imgformat = this.wImgFormat.get("value");
        },

        deserializeInMixin: function (data) {
            var value = data[this.serializePrefix];
            if (value === undefined) { return; }

            this.wConnection.set("value", value.connection);
            this.wSRS.set("value", value.srs.id);
            this.wWMSLayers.set("value", value.wmslayers.split(/,\s*/).join(", "));
            this.wImgFormat.set("value", value.imgformat);
        }
    });
});
