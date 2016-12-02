define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dijit/form/TextBox",
    "dijit/ConfirmDialog",
    "dijit/Editor",
    "dijit/_editor/plugins/LinkDialog",
    "ngw-pyramid/i18n!pyramid",
    // css
    "xstyle/css!./resource/RTETextBox.css"
], function (
    declare,
    lang,
    domClass,
    domConstruct,
    TextBox,
    ConfirmDialog,
    Editor,
    LinkDialog,
    i18n
) {
    var RTEDialog = declare([ConfirmDialog], {
        style: "width: 600px",

        buildRendering: function () {
            this.inherited(arguments);

            this.editor = new Editor({
                extraPlugins: ["|", "createLink", "unlink"]
            }).placeAt(this);
        },

        show: function (textbox) {
            this.inherited(arguments);
            this.textbox = textbox;
        },

        execute: function () {
            this.textbox.set("value", this.editor.get("value"));
        }
    });

    return declare([TextBox], {
        constructor: function (params) {
            declare.safeMixin(this, params);

            this.dialog = new RTEDialog({
                title: this.label
            });
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-pyramid-form-RTETextBox");

            this.openNode = domConstruct.create("a", {
                class: "ngw-pyramid-form-RTETextBox__icon material-icons icon-edit ",
                title: i18n.gettext("Rich Text Editor"),
                onclick: lang.hitch(this, this.openRTEDialog)
            }, this.domNode);
        },

        openRTEDialog: function () {
            if (!this.get("disabled")) {
                this.dialog.editor.set("value", this.get("value"));
                this.dialog.show(this);
            }
        }
    });
});
