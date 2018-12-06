/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dijit/layout/LayoutContainer",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/editor",
    "dgrid/extensions/DijitRegistry",
    "ngw-pyramid/i18n!wmsclient",
    "ngw-resource/serialize",
    //
    "xstyle/css!./resource/LayerVendorParamsWidget.css",
    "ngw/dgrid/css"
], function (
    declare,
    lang,
    domStyle,
    domClass,
    Memory,
    Observable,
    LayoutContainer,
    Toolbar,
    Button,
    TextBox,
    Grid,
    Selection,
    editor,
    DijitRegistry,
    i18n,
    serialize
) {
    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",

        columns: [
            editor({
                field: "key",
                label: i18n.gettext("Key"),
                sortable: false,
                autoSave: true,
                editor: TextBox,
                editorArgs: {style: "width: 100%; border: none;"}
            }),

            editor({
                field: "value",
                label: i18n.gettext("Value"),
                sortable: false,
                autoSave: true,
                editor: TextBox,
                editorArgs: {style: "width: 100%; border: none;"}
            })

        ]
    });

    return declare([LayoutContainer, serialize.Mixin], {
        title: i18n.gettext("Vendor parameters"),
        serializePrefix: "wmsclient_layer",

        constructor: function () {
            this.store = new Observable(new Memory({idProperty: "id"}));
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-wmsclient-layer-vendor-params-widget");

            this.grid = new GridClass({store: this.store});
            this.grid.region = "center";

            domClass.add(this.grid.domNode, "dgrid-border-fix");
            domStyle.set(this.grid.domNode, "border", "none");
            this.addChild(this.grid);

            this.toolbar = new Toolbar({});

            var store = this.store, add = function () {
                store.add({key: "", value: ""});
            };

            this.toolbar.addChild(new Button({
                label: i18n.gettext("Add"),
                iconClass: "dijitIconNewTask",
                onClick: add
            }));

            this.toolbar.addChild(new Button({
                label: i18n.gettext("Delete"),
                iconClass: "dijitIconDelete",
                onClick: lang.hitch(this, function () {
                    for (var key in this.grid.selection) {
                        this.store.remove(key);
                    }
                })
            }));

            this.toolbar.region = "top";
            this.addChild(this.toolbar);
        },

        deserializeInMixin: function (data) {
            var items = data[this.serializePrefix].vendor_params,
                store = this.store;

            for (var key in items) {
                var value = items[key];
                store.add({key: key, value: value.toString()});
            }
        },

        serializeInMixin: function (data) {
            if (data[this.serializePrefix] === undefined) { data[this.serializePrefix] = {}; }
            data[this.serializePrefix].vendor_params = {};

            var items = data[this.serializePrefix].vendor_params;

            this.store.query().forEach(function (f) {
                var value = f.value;
                if (f.key != "") {
                    items[f.key] = value;
                }
            });
        }
    });
});
