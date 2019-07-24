define([
    'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct', 'dojo/dom-style',
    'dojo/Deferred', 'dojo/on', 'dojo/Evented', 'dojo/store/Memory', 'dijit/Dialog', 'dijit/form/Button',
    'dijit/layout/ContentPane', 'dijit/layout/BorderContainer', 'dojox/html/entities',
    'dijit/Editor', 'dijit/_editor/plugins/FontChoice', 'dijit/_editor/plugins/TextColor',
    'dojox/layout/TableContainer', 'dijit/form/Textarea', 'dijit/form/TextBox',
    'dijit/form/NumberTextBox', 'dijit/form/Select', 'dijit/form/DropDownButton',
    'ngw-pyramid/i18n!webmap', 'ngw-webmap/ui/AnnotationsDialog/AnnotationsSettings',
    'xstyle/css!./AnnotationsDialog.css'
], function (declare, lang, domConstruct, domStyle, Deferred, on, Evented, Memory, Dialog,
             Button, ContentPane, BorderContainer, htmlEntities, Editor, FontChoice, TextColor, TableContainer, Textarea,
             TextBox, NumberTextBox, Select, DropDownButton, i18n, AnnotationsSettings) {
    
    return declare([Dialog, Evented], {
        _deferred: null,
        _annFeature: null,
        
        constructor: function (options) {
            declare.safeMixin(this, options);
            this.style = 'width: 400px';
        },
        
        postCreate: function () {
            this.inherited(arguments);
            
            this.editor = new Editor({
                extraPlugins: ['foreColor', 'hiliteColor', {
                    name: 'dijit/_editor/plugins/FontChoice',
                    command: 'fontSize',
                    generic: true
                }],
                height: '300',
                plugins: ['cut', 'copy', 'paste', '|', 'bold', 'italic', 'underline', 'removeFormat', '|', 'createLink'],
                style: 'font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; font-size: 14px;'
            }).placeAt(this.containerNode);
            
            this.annotationsSettings = new AnnotationsSettings()
                .placeAt(this.containerNode);
            
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
            
            this.onCancel = lang.hitch(this, this.onUndo);
        },
        
        onSave: function () {
            this.emit('save');
            var newData = this._updateFeatureFromDialog();
            if (this._deferred) this._deferred.resolve({
                action: 'save',
                annFeature: this._annFeature,
                newData: newData
            }, this);
            this.hide();
        },
        
        onUndo: function () {
            this.emit('undo');
            if (this._deferred) this._deferred.resolve({
                action: 'undo',
                annFeature: this._annFeature
            }, this);
            this.hide();
        },
        
        onDelete: function () {
            this.emit('delete');
            if (this._deferred) this._deferred.resolve({
                action: 'delete',
                annFeature: this._annFeature
            }, this);
            this.hide();
        },
        
        _updateFeatureFromDialog: function () {
            return {
                style: {
                    circle: {
                        radius: this.annotationsSettings.circleSize.get('value'),
                        stroke: {
                            color: this.annotationsSettings.colorStroke.value,
                            width: this.annotationsSettings.widthStroke.get('value')
                        },
                        fill: {
                            color: this.annotationsSettings.fillStroke.value
                        }
                    }
                },
                description: htmlEntities.encode(this.editor.get('value'))
            }
        },
        
        showForEdit: function (annFeature) {
            var annotationInfo = annFeature.getAnnotationInfo(),
                id = annFeature.getId();

            this.editor.set('value', htmlEntities.decode(annotationInfo.description));
            this.annotationsSettings.circleSize.set('value', annotationInfo.style.circle.radius);
            this.annotationsSettings.widthStroke.set('value', annotationInfo.style.circle.stroke.width);
            this.annotationsSettings.colorStroke.value = annotationInfo.style.circle.stroke.color;
            this.annotationsSettings.fillStroke.value = annotationInfo.style.circle.fill.color;
            
            if (id) {
                this.titleNode.innerHTML = i18n.gettext('Edit annotation');
                domStyle.set(this.btnDelete.domNode, 'display', 'block');
            } else {
                this.titleNode.innerHTML = i18n.gettext('Create annotation');
                domStyle.set(this.btnDelete.domNode, 'display', 'none');
            }
            
            this.show();
            
            this._annFeature = annFeature;
            this._deferred = new Deferred();
            return this._deferred;
        },
        
        showLastData: function () {
            this.show();
        }
    });
});
