/* globals define */
define([
    'dojo/_base/declare', 'dojo/_base/lang', 'dojo/request/xhr',
    'ngw/route', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin', 'ngw-resource/serialize',
    'dijit/form/CheckBox', '@nextgisweb/pyramid/i18n!',
    '@nextgisweb/pyramid/settings!',
    // resource
    'dojo/text!./OtherSettings.hbs',
    // template
    'dijit/form/Select', 'dojox/layout/TableContainer'
], function (
    declare, lang, xhr, route,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    serialize, CheckBox, i18n, settingsWebmap, template
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: i18n.gettext('Settings'),
        templateString: i18n.renderTemplate(template),
        serializePrefix: 'webmap',
        
        postCreate: function () {
            this.inherited(arguments);
            
            if (settingsWebmap.annotation) this._buildAnnotationsControls();
        },
        
        _buildAnnotationsControls: function () {
            this.chbAnnotationEnabled = new CheckBox({
                title: i18n.gettext('Enable annotations')
            });
            this.chbAnnotationDefault = new CheckBox({
                title: i18n.gettext('Show annotations by default')
            });

            this.tcControls.addChild(this.chbAnnotationEnabled);
            this.tcControls.addChild(this.chbAnnotationDefault);
        },
        
        serializeInMixin: function (data) {
            if (data.webmap === undefined) {
                data.webmap = {};
            }
            var value = data.webmap;
            value.editable = this.chbEditable.get('checked');
            
            if (settingsWebmap.annotation) {
                value.annotation_enabled = this.chbAnnotationEnabled.get('checked');
                value.annotation_default = this.chbAnnotationDefault.get('checked');
            }
        },
        
        deserializeInMixin: function (data) {
            var value = data.webmap;
            this.chbEditable.set('checked', value.editable);
            
            if (settingsWebmap.annotation) {
                this.chbAnnotationEnabled.set('checked', value.annotation_enabled);
                this.chbAnnotationDefault.set('checked', value.annotation_default);
            }
        }
    });
});
