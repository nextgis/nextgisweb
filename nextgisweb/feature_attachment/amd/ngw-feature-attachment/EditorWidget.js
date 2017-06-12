/* globals define */
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
    "dijit/form/Textarea",
    "dojox/form/Uploader",
    "put-selector/put",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/editor",
    "dgrid/extensions/DijitRegistry",
    "ngw/route",
    "ngw-pyramid/i18n!feature_attachment",
    //
    "xstyle/css!./resource/EditorWidget.css",
    "ngw/dgrid/css"
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
    Textarea,
    Uploader,
    put,
    Grid,
    Selection,
    editor,
    DijitRegistry,
    route,
    i18n
) {
    function fileSizeToString(size) {
        var units = ["B", "KB", "MB", "GB"],
            i = 0;            
        while (size >= 1024) {
            size /= 1024;
            ++i;
        }
        return size.toFixed(1) + " " + units[i];
    }

    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",
        subRows: [
            [
                {
                    field: "preview",
                    label: "",
                    rowSpan: 2,
                    sortable: false,
                    formatter: function (url) {
                        if (url) {
                            var node = put("img", {src: url});
                            return node.outerHTML;
                        } else {
                            return "";
                        }
                    }
                },
                editor({
                    field: "name",
                    label: i18n.gettext("File name"),
                    rowSpan: 1,
                    autoSave: true,
                    editor: TextBox,
                    editorArgs: {style: "width: 100%; border: none;"}
                }),
                {
                    field: "size",
                    label: i18n.gettext("Size"),
                    rowSpan: 1,
                    formatter: fileSizeToString
                },
                {
                    field: "mime_type",
                    label: i18n.gettext("MIME type"),
                    rowSpan: 1
                },
            ],
            [
                editor({
                    field: "description",
                    label: i18n.gettext("Description"),
                    colSpan: 3,
                    sortable: false,
                    autoSave: true,
                    editor: Textarea,
                    editorArgs: {style: "width: 100%; border: none;"}
                })
            ]
        ]
    });

    return declare([LayoutContainer], {
        title: i18n.gettext("Attachments"),

        constructor: function () {
            this.store = new Observable(new Memory({idProperty: "lid"}));           
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-feature-attachment-EditorWidget");

            this.grid = new GridClass({store: this.store});
            this.grid.region = "center";
           
            domClass.add(this.grid.domNode, "dgrid-border-fix");
            domStyle.set(this.grid.domNode, "border", "none");
            this.addChild(this.grid);

            this.toolbar = new Toolbar({});

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
                        name: f.name,
                        size: f.size,
                        mime_type: f.mime_type,
                        file_upload: {
                            id: f.id,
                            size: f.size
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

        _setValueAttr: function (data) {
            var store = this.store;
            store.query().forEach(function (itm) {
                store.remove(itm.lid);
            });

            for (var key in data) {
                var value = lang.clone(data[key]);
                if (value.is_image) {
                    value.preview = route.feature_attachment.image({
                        id: this.resource,
                        fid: this.feature,
                        aid: value.id
                    }) + "?size=80x60";
                }
                this.store.add(value);
            }            
        },

        _getValueAttr: function () {
            var result = [];
            this.store.query().forEach(function (f) {
                var c = lang.clone(f);
                c.lid = undefined;
                result.push(c);
            });
            return result;
        }
    });
});
