define([
    'dojo/_base/declare',
    '@nextgisweb/pyramid/i18n!',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    "dijit/form/Button",
    "dojo/text!./NGWButton.hbs"
], function (
    declare,
    i18n,
    lang,
    domClass,
    domConstruct,
    _WidgetBase,
    _TemplatedMixin,
    Button,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin],{
        templateString: i18n.renderTemplate(template),
        size: "medium", // small, large
        type: "contained", // outlined
        icon: false,
        iconPosition: 'first',
        rounded: false,
        color: 'primary', //secondary
        constructor: function (options) {
            declare.safeMixin(this,options);
            options = ['size', 'type', 'color', 'icon', 'rounded'];
            this.iconName = this.icon;
            this.icon = this.icon ? true : false;
            this.classes = this._getClasses(options);
        },
        postCreate: function(){
            this._addClasses();
            if (this.label) this.containerNode.innerHTML = this.label;
            if (this.icon) this._insertIcon(this.iconName, this.iconPosition);
        },
        _getClasses: function(options) {
            return options
                .filter(lang.hitch(this, function(option){ return this[option]; }))
                .map(lang.hitch(this, function(option){
                    return this[option] === true ? ("ngw-button--" + option) : ("ngw-button--" + this[option]);
                }));
        },
        _addClasses: function() {
            this.classes.forEach(lang.hitch(this, function(cls){
               domClass.add(this.domNode, cls);
            }));
        },
        _insertIcon: function(icon, position) {
            var cssClasses = '';
            if (position === 'first') cssClasses = 'ngw-button__icon--prepend';
            if (position === 'last') cssClasses = 'ngw-button__icon--append';
            var iconNode = domConstruct.place("<i class='ngw-button__icon " + cssClasses + " material-icons'>" + icon + "</i>", this.domNode, position);
        }
    });
});
