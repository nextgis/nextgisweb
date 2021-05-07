define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dijit/layout/LayoutContainer",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "ngw-file-upload/FileUploader",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/editor",
    "dgrid/extensions/DijitRegistry",
    "ngw/route",
    "ngw-resource/serialize",
    "ngw-spatial-ref-sys/SRSSelect",
    "@nextgisweb/pyramid/i18n!",
    //
    "xstyle/css!./resource/ItemWidget.css"
], function (
    declare,
    lang,
    array,
    domStyle,
    domClass,
    Memory,
    Observable,
    LayoutContainer,
    Toolbar,
    Button,
    TextBox,
    Uploader,
    Grid,
    Selection,
    editor,
    DijitRegistry,
    route,
    serialize,
    SRSSelect,
    i18n
) {
    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",
        columns: [
            editor({
                field: "display_name",
                label: i18n.gettext("File name"),
                autoSave: true,
                editor: TextBox,
                editorArgs: {
                    style: "width: 100%; border: none;"
                }
            })
        ]
    });

    return declare([LayoutContainer, serialize.Mixin], {
        title: i18n.gettext("Items"),

        constructor: function () {
            this.wSrs = SRSSelect({
                allSrs: null
            });
            this.store = new Observable(new Memory({
                idProperty: "id"
            }));
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-raster-mosaic-ItemWidget");

            this.grid = new GridClass({
                store: this.store
            });
            this.grid.region = "center";

            domClass.add(this.grid.domNode, "dgrid-border-fix");
            domStyle.set(this.grid.domNode, "border", "none");
            this.addChild(this.grid);

            this.toolbar = new Toolbar();

            this.uploader = new Uploader({
                label: i18n.gettext("Upload"),
                iconClass: "dijitIconNewTask",
                multiple: true,
                uploadOnSelect: true,
                url: route.file_upload.upload(),
                name: "file"
            }).placeAt(this.toolbar);

            this.uploader.on("complete", lang.hitch(this, function (data) {
                array.forEach(data.upload_meta, function (f) {
                    this.store.put({
                        display_name: f.name,
                        file_upload: {
                            id: f.id
                        }
                    });
                }, this);
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

        serializeInMixin: function (data) {
            if (data.raster_mosaic === undefined) {
                data.raster_mosaic = {};
            }
            var mosaic = data.raster_mosaic;

            mosaic.srs = {
                id: this.wSrs.get("value")
            };
            mosaic.items = [];
            this.store.query().forEach(function (r) {
                var item = lang.clone(r);
                mosaic.items.push(item);
            });
        },

        deserializeInMixin: function (data) {
            var value = data.raster_mosaic.items;
            if (value === undefined) {
                return;
            }

            array.forEach(value, function (item) {
                this.store.add({
                    id: item.id,
                    display_name: item.display_name
                })
            }, this);
        }
    });
});
