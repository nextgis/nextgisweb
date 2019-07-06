define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/Evented",
    "dijit/Dialog",
    "dijit/form/Button",
    "dojox/layout/TableContainer",
    "dijit/form/Select",
    "dijit/form/SimpleTextarea",
    "ngw-pyramid/i18n!webmap"
], function (
    declare, 
    lang, 
    domConstruct,
    on, 
    Evented, 
    Dialog, 
    Button, 
    TableContainer,
    Select,
    SimpleTextarea, 
    i18n
) {
    return declare([Dialog, Evented], {

        _placeholders: {
            epsg: '4326',
            mapinfo: "8, 1001, 7, 37.98333333333, 0, 1, 1300000, -4511057.628",
            proj4: "+proj=tmerc +lat_0=0 +lon_0=40.98333333333 +k=1 +x_0=1300000 +y_0=-4511057.63 +ellps=krass +towgs84=23.57,-140.95,-79.8,0,0.35,0.79,-0.22 +units=m +no_defs"
        },

        constructor: function (options) {
            declare.safeMixin(this, options);

            this.title = i18n.gettext("Import SRS definition");
            this.style = "width: 600px";
        },

        postCreate: function () {
            var widget = this;
            this.inherited(arguments);

            this.container = new TableContainer({
                cols: 1,
                labelWidth: "70",
                customClass: "dijitDialogPaneContentArea",
            }).placeAt(this.containerNode);

            this.format = new Select({
                label: i18n.gettext("Format"),
                style: "width: 100%",
                options: [
                    { value: "proj4", label: "PROJ" },
                    { value: "mapinfo", label: "MapInfo" },
                    { value: "epsg", label: "EPSG" }
                ]
            }).placeAt(this.container);

            this.format.on("change", function () {
                widget._updatePlaceholder();
            });

            this.textArea = new SimpleTextarea({
                label: i18n.gettext("Definition"),
                rows: 4
            }).placeAt(this.container);

            this.actionBar = domConstruct.create("div", {
                class: "dijitDialogPaneActionBar"
            }, this.containerNode);

            this.btnOk = new Button({
                label: "OK",
                onClick: lang.hitch(this, this.onSave)
            }).placeAt(this.actionBar);

            this.btnContinue = new Button({
                label: i18n.gettext("Cancel"),
                onClick: lang.hitch(this, this.onContinue)
            }).placeAt(this.actionBar);

            this._updatePlaceholder();
        },

        onSave: function () {
            this.emit("save", { 
                projStr: this.textArea.get("value"), 
                format: this.format.get("value")
            });
            this.hide();
        },

        onContinue: function () {
            this.emit("continue");
            this.hide();
        },

        _updatePlaceholder: function () {
            var format = this.format.get("value");
            var placeholder = this._placeholders[format] || '';
            // Not work correct
            // this.textArea.set("placeHolder", placeholder);

            this.textArea.domNode.placeholder = placeholder;
        }
    });
});