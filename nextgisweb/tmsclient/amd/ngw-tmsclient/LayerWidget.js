define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request/xhr",
    "dojo/store/Memory",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "@nextgisweb/pyramid/i18n!",
    "ngw/route",
    "./LayersDialog",
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
    xhr,
    Memory,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    i18n,
    route,
    LayersDialog,
    template
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        title: i18n.gettext("TMS layer"),
        serializePrefix: "tmsclient_layer",
        _store: new Memory({
            data: [{ index: -1, children: [] }],
            idProperty: "index",
            getChildren: function (object) { return object.children || []; }
        }),

        _updateStore: function (data) {
            var root = this._store.query({ index: -1 })[0];
            root.children = [];
            for (var i = 0; i < data.length; i++) {
                var value = lang.clone(data[i]);
                value.index = i;
                root.children.push(value);
            }

            this.btnChooseLayer.set("disabled", data.length === 0);
        },

        postCreate: function () {
            this.inherited(arguments);

            this.wConnection.on("update", function (event) {
                var connection = event.value;
                xhr.get(route.tmsclient.connection.layers(connection), {
                    handleAs: "json"
                }).then(this._updateStore.bind(this));
            }.bind(this));

            this.btnChooseLayer.on("click", function () {
                var layersDialog = new LayersDialog({
                    store: this._store
                });
                layersDialog.pick().then(function (data) {
                    this.wTileSize.set("value", data.tilesize);
                    this.wLayerName.set("value", data.layer);
                    this.wMinZoom.set("value", data.minzoom);
                    this.wMaxZoom.set("value", data.maxzoom);
                    this.wExtentLeft.set("value", data.bounds[0]);
                    this.wExtentRight.set("value", data.bounds[2]);
                    this.wExtentBottom.set("value", data.bounds[1]);
                    this.wExtentTop.set("value", data.bounds[3]);
                }.bind(this));
            }.bind(this));
        },

        serializeInMixin: function (data) {
            this.inherited(arguments);
            data[this.serializePrefix].srs = {id: this.wSRS.get("value")};
        }
    });
});
