define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/on',
    'dojo/Evented',
    'dijit/Dialog',
    'dijit/form/Button',
    'dijit/layout/ContentPane',
    'ngw-pyramid/i18n!webmap'
], function (declare, lang, domConstruct, on, Evented, Dialog, Button, ContentPane, i18n) {
    return declare([Dialog, Evented], {

        constructor: function (options) {
            declare.safeMixin(this, options);

            this.title = i18n.gettext('Stopping editing');
            this.style = 'width: 400px';
        },

        postCreate: function () {
            this.inherited(arguments);

            this.contentPane = new ContentPane({
                content: "<p>" + i18n.gettext("Do you want to save changes?") + "</p>"
            }).placeAt(this.containerNode);

            this.actionBar = domConstruct.create("div", {
                class: "dijitDialogPaneActionBar"
            }, this.containerNode);

            this.btnOk = new Button({
                label: i18n.gettext("Save"),
                onClick: lang.hitch(this, this.onSave)
            }).placeAt(this.actionBar);

            this.btnUndo = new Button({
                label: i18n.gettext("Don't save"),
                onClick: lang.hitch(this, this.onUndo)
            }).placeAt(this.actionBar);

            this.btnContinue = new Button({
                label: i18n.gettext("Cancel"),
                onClick: lang.hitch(this, this.onContinue)
            }).placeAt(this.actionBar);
        },

        onSave: function () {
            this.emit('save');
            this.hide();
        },

        onUndo: function () {
            this.emit('undo');
            this.hide();
        },

        onContinue: function () {
            this.emit('continue');
            this.hide();
        }
    });
});