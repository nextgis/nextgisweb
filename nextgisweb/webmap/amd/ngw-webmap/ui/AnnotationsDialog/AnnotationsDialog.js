define([
    'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct',
    'dojo/Deferred', 'dojo/on', 'dojo/Evented', 'dojo/store/Memory', 'dijit/Dialog', 'dijit/form/Button',
    'dijit/layout/ContentPane', 'dijit/layout/BorderContainer',
    'dijit/Editor', 'dijit/_editor/plugins/FontChoice', 'dijit/_editor/plugins/TextColor',
    'dojox/layout/TableContainer', 'dijit/form/Textarea', 'dijit/form/TextBox',
    'dijit/form/NumberTextBox', 'dijit/form/Select', 'dijit/form/DropDownButton',
    'ngw-pyramid/i18n!webmap', 'xstyle/css!./AnnotationsDialog.css'
], function (declare, lang, domConstruct, Deferred, on, Evented, Memory, Dialog,
             Button, ContentPane, BorderContainer, Editor, FontChoice, TextColor, TableContainer, Textarea,
             TextBox, NumberTextBox, Select, DropDownButton, i18n) {
    
    var buildColor = function (id, labelKey, className) {
        var translatedName = i18n.gettext(labelKey);
        
        return {
            id: id,
            name: translatedName,
            label: '<i class="select-color ' + className + '"></i><span>' + translatedName + '</span>'
        };
    };
    
    var colors = [
        buildColor('#FF0000', 'Red', 'red'),
        buildColor('#008000', 'Green', 'green'),
        buildColor('#0000FF', 'Blue', 'blue'),
        buildColor('#FFFF00', 'Yellow', 'yellow'),
        buildColor('#FFA500', 'Orange', 'orange'),
        buildColor('#000000', 'Black', 'black'),
        buildColor('#ffffff', 'White', 'white')
    ];
    
    colors.sort(function (a, b) {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });
    
    var colorsStore = new Memory({
        data: colors
    });
    
    return declare([Dialog, Evented], {
        _deferred: null,
        _feature: null,
        
        constructor: function (options) {
            declare.safeMixin(this, options);
            this.style = 'width: 400px';
        },
        
        postCreate: function () {
            this.inherited(arguments);
            
            this.editor = new Editor({
                plugins: ['cut', 'copy', 'paste', '|', 'bold', 'italic', 'underline', 'removeFormat', '|', 'createLink'],
                extraPlugins: ['foreColor', 'hiliteColor', {
                    name: 'dijit/_editor/plugins/FontChoice',
                    command: 'fontSize',
                    generic: true
                }],
                height: '300'
            }).placeAt(this.containerNode);
            
            var tableContainer = new TableContainer({
                customClass: 'adt',
                labelWidth: '150'
            }).placeAt(this.containerNode);
            
            this.circleSize = new NumberTextBox({
                label: i18n.gettext('Circle size, px'),
                width: '100%'
            });
            
            this.circleColor = new Select({
                store: colorsStore,
                width: '100%',
                label: i18n.gettext('Circle color'),
                labelAttr: 'label',
                labelType: 'html'
            });
            
            this.circleColor.on('change', function (evt) {
                console.log(evt);
            });
            
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
            
            this.btnDelete = new Button({
                label: i18n.gettext('Delete'),
                onClick: lang.hitch(this, this.onDelete),
                'class': 'delete-annotation',
                style: 'float: left'
            }).placeAt(this.actionBar);
        },
        
        onSave: function () {
            this.emit('save');
            this._makeFeatureFromDialog();
            if (this._deferred) this._deferred.resolve({
                action: 'save',
                feature: this._feature
            });
            this.hide();
        },
        
        onUndo: function () {
            this.emit('undo');
            if (this._deferred) this._deferred.resolve({
                action: 'undo',
                feature: this._feature
            });
            this.hide();
        },
        
        onDelete: function () {
            this.emit('delete');
            if (this._deferred) this._deferred.resolve({
                action: 'delete',
                feature: this._feature
            });
            this.hide();
        },
        
        _makeFeatureFromDialog: function () {
            var style = {
                circle: {
                    radius: 5,
                    stroke: {color: 'red', width: 1},
                    fill: {color: 'red'}
                }
            };
            
            this._feature.setProperties({
                style: style,
                description: this.editor.get('value')
            });
        },
        
        showForCreate: function (feature) {
            this.set('title', i18n.gettext('Create new annotation'));
            this.editor.set('value', i18n.gettext('Your annotation text'));
            this.circleSize.set('value', 5);
            this.circleColor.set('value', '#FF0000');
            
            this._feature = feature;
            
            this.show();
            this._deferred = new Deferred();
            return this._deferred;
        },
        
        showForEdit: function (feature) {
            this.title = i18n.gettext('Edit annotation');
            this.editor.set('value', i18n.gettext('Your annotation text'));
            this.circleSize.set('value', 5);
            this.circleColor.set('value', '#FF0000');
            this.show();
        }
    });
});
