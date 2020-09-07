define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dijit/layout/LayoutContainer",
    "dijit/form/Button",
    "dijit/Toolbar",
    "dijit/ProgressBar",
    "dijit/Dialog",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/editor",
    "dgrid/extensions/DijitRegistry",
    "ngw/route",
    "ngw-file-upload/FileUploader",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!icon_library",
    // resource
    "xstyle/css!./resource/Widget.css",
    "ngw/dgrid/css"
], function (
    declare,
    lang,
    array,
    domStyle,
    domClass,
    domConstruct,
    Memory,
    Observable,
    LayoutContainer,
    Button,
    Toolbar,
    ProgressBar,
    Dialog,
    Grid,
    Selection,
    editor,
    DijitRegistry,
    route,
    Uploader,
    serialize,
    i18n
) {
    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",

        columns: [
            {
                field: "name",
                label: i18n.gettext("File name"),
                sortable: true
            }
        ]
    });


    return declare([LayoutContainer, serialize.Mixin], {
        title: i18n.gettext("SVG symbol library"),
        serializePrefix: "svg_symbol_library",

        constructor: function () {
            this.store = new Observable(new Memory({idProperty: "name"}));
            this.archiveId = null;
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-svg-symbol-library-widget");

            this.toolbar = new Toolbar({
                region: 'top'
            }).placeAt(this);

            this.uploaders = [];

            var fileUploader = new Uploader({
                label: i18n.gettext("Upload files"),
                iconClass: "dijitIconNewTask",
                multiple: true,
                uploadOnSelect: true,
                url: route.file_upload.upload(),
                name: "file"
            }).placeAt(this.toolbar);
            this.uploaders.push(fileUploader);

            fileUploader.on("complete", lang.hitch(this, function (data) {
                array.forEach(data.upload_meta, function (f) {
                    // Remove existing file without extension
                    var name = f.name.substring(0, f.name.lastIndexOf('.'));
                    this.store.remove(name);

                    this.store.put(f);
                }, this);
            }));

            var archiveUploader = new Uploader({
                label: i18n.gettext("Upload archive"),
                iconClass: "dijitIconDocuments",
                multiple: false,
                uploadOnSelect: true,
                url: route.file_upload.upload(),
                name: "file",
            }).placeAt(this.toolbar);
            this.uploaders.push(archiveUploader);

            archiveUploader.on("complete", lang.hitch(this, function (data) {
                this.store.query().forEach(function (f) { this.store.remove(f.name) }, this);
                this.archiveId = data.upload_meta[0].id;

                domClass.add(this.domNode, 'archive-loaded');
            }));

            this.uploaders.forEach(function(uploader) {
                uploader.on("complete", lang.hitch(this, function () {
                    domStyle.set(this.progressbar.domNode, 'display', 'none');
                }));
                uploader.on("begin", lang.hitch(this, function () {
                    domStyle.set(this.progressbar.domNode, 'display', 'block');
                }));
                uploader.on("progress", lang.hitch(this, function (evt) {
                    if (evt.type === "progress") {
                        this.progressbar.set('value', evt.decimal * 100);
                    }
                }));
            }, this);

            this.toolbar.addChild(new Button({
                label: i18n.gettext("Delete"),
                iconClass: "dijitIconDelete",
                onClick: lang.hitch(this, function () {
                    for (var key in this.grid.selection) {
                        this.store.remove(key);
                    }
                })
            }));

            this.progressbar = new ProgressBar({
                style: "float: right; margin-right: 4px; width: 10em; display: none;"
            }).placeAt(this.toolbar);

            this.grid = new GridClass({store: this.store});
            this.grid.region = "center";

            domClass.add(this.grid.domNode, "dgrid-border-fix");
            domStyle.set(this.grid.domNode, "border", "none");

            this.addChild(this.grid);
        },

        validateDataInMixin: function () {
            for (var i = 0; i < this.uploaders.length; i++) {
                if (this.uploaders[i].inProgress) {
                    return false;
                }
            }
            return true;
        },

        deserializeInMixin: function (data) {
            var files = data[this.serializePrefix].files;
            for (var key in files) { this.store.add(files[key]) }
        },

        serializeInMixin: function (data) {
            if (data[this.serializePrefix] === undefined) { data[this.serializePrefix] = {}; }

            if (this.archiveId) {
                data[this.serializePrefix].archive = {id: this.archiveId};
            } else {
                data[this.serializePrefix].files = [];

                var files = data[this.serializePrefix].files;
                this.store.query().forEach(function (f) { files.push(f) });
            }
        }

    });
});
