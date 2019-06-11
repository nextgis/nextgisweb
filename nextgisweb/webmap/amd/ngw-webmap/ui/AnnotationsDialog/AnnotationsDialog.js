define([
    'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct',
    'dojo/on', 'dojo/Evented', 'dijit/Dialog', 'dijit/form/Button',
    'dijit/layout/ContentPane', 'dijit/layout/BorderContainer',
    'dojox/layout/TableContainer', 'dijit/form/Textarea', 'dijit/form/TextBox',
    'dijit/form/NumberTextBox', 'dojox/widget/ColorPicker', 'dijit/form/DropDownButton', 'ngw-pyramid/i18n!webmap',
    "xstyle/css!" + ngwConfig.amdUrl + 'dojox/widget/ColorPicker/ColorPicker.css'
], function (declare, lang, domConstruct, on, Evented, Dialog,
             Button, ContentPane, BorderContainer, TableContainer, Textarea,
             TextBox, NumberTextBox, ColorPicker, DropDownButton, i18n) {
    return declare([Dialog, Evented], {
        constructor: function (options) {
            declare.safeMixin(this, options);
            this.title = i18n.gettext('Stopping editing');
            this.style = 'width: 400px';
        },
        
        postCreate: function () {
            this.inherited(arguments);
            
            var tableContainer = new TableContainer({
                customClass: 'labelsAndValues',
                labelWidth: '150'
            }).placeAt(this.containerNode);
            
            this.description = new Textarea({
                label: i18n.gettext('Description'),
                rows: 3
            });
            
            this.circleSize = new NumberTextBox({
                label: i18n.gettext('Circle size, px')
            });
            
            this.circleColor = new DropDownButton({
                label: i18n.gettext('Circle color')
            });
            
            this.circleColor.addChild(new ColorPicker({
                animatePoint: false,
                showHsv: false,
                webSafe: false,
                showRgb: false
            }));
            
            tableContainer.addChild(this.description);
            tableContainer.addChild(this.circleSize);
            tableContainer.addChild(this.circleColor);
            
            this.actionBar = domConstruct.create('div', {
                class: 'dijitDialogPaneActionBar'
            }, this.containerNode);
            
            this.btnOk = new Button({
                label: i18n.gettext('Save'),
                onClick: lang.hitch(this, this.onSave)
            }).placeAt(this.actionBar);
            
            this.btnUndo = new Button({
                label: i18n.gettext('Don\'t save'),
                onClick: lang.hitch(this, this.onUndo)
            }).placeAt(this.actionBar);
            
            this.btnContinue = new Button({
                label: i18n.gettext('Cancel'),
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
        },
        
        showForCreate: function (feature) {
            this.show();
        }
    });
});
