define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/on',
    'dojo/Evented',
    'dijit/Dialog',
    'dijit/form/Button',
    'dijit/form/SimpleTextarea',
    'ngw-pyramid/i18n!webmap'
], function (declare, lang, domConstruct, on, Evented, Dialog, Button, SimpleTextarea, i18n) {
    return declare([Dialog, Evented], {

        constructor: function (options) {
            declare.safeMixin(this, options);

            this.title = i18n.gettext('Insert projection string');
            this.style = 'width: 400px';
        },

        postCreate: function () {
            this.inherited(arguments);

            this.textArea = new SimpleTextarea().placeAt(this.containerNode);

            this.actionBar = domConstruct.create("div", {
                class: "dijitDialogPaneActionBar"
            }, this.containerNode);

            this.btnOk = new Button({
                label: i18n.gettext("Insert"),
                onClick: lang.hitch(this, this.onSave)
            }).placeAt(this.actionBar);

            this.btnContinue = new Button({
                label: i18n.gettext("Cancel"),
                onClick: lang.hitch(this, this.onContinue)
            }).placeAt(this.actionBar);
        },

        onSave: function () {
            this.emit('save', { 
                projStr: this.textArea.get('value'), 
                // format: 'proj4'
            });
            this.hide();
        },

        onContinue: function () {
            this.emit('continue');
            this.hide();
        }
    });
});