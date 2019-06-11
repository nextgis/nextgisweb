define([
    'dojo/_base/declare',
    'dojo/topic',
    '../Base',
    'ngw-pyramid/i18n!webmap'
], function (
    declare,
    topic,
    Base,
    i18n
) {
    return declare(Base, {
        layerEditor: null,
        
        constructor: function (options) {
            declare.safeMixin(this, options);
            
            this.label = i18n.gettext('Add annotations');
            this.customIcon = '<span class=\'ol-control__icon material-icons\'>add_box</span>';
        },
        
        activate: function () {
            topic.publish('webmap/annotations/add/activate');
        },
        
        deactivate: function () {
            topic.publish('webmap/annotations/add/deactivate');
        }
    });
});
