define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!pyramid',
    'ngw-pyramid/hbs-i18n',
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
    hbsI18n,
    lang,
    domClass,
    domConstruct,
    _WidgetBase,
    _TemplatedMixin,
    Button,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin],{
        templateString: hbsI18n(template, i18n),
        size: "medium", // small, large
        type: "contained", // outlined
        icon: false,
        rounded: false,
        color: 'primary',
        constructor: function (options) {
            declare.safeMixin(this,options);
            var options = ['size', 'type', 'color', 'icon', 'rounded'];            
            this.iconName = this.icon;
            this.icon = this.icon ? true : false;
            this.classes = this._getClasses(options);
        },
        postCreate: function(){
            this._addClasses();
            if (this.label) this.containerNode.innerHTML = this.label;
            if (this.icon) this._insertIcon(this.iconName);
        },
        _getClasses(options) {
            return options
                .filter(lang.hitch(this, function(option){ return this[option]; }))
                .map(lang.hitch(this, function(option){
                    return this[option] === true ? `ngw-button--${option}` : `ngw-button--${this[option]}`;
                }));
        },
        _addClasses() {
            this.classes.forEach(lang.hitch(this, function(cls){
               domClass.add(this.domNode, cls);
            }));
        },
        _insertIcon(icon) {
            var iconNode = domConstruct.place(`<i class='ngw-button__icon material-icons'>${icon}</i>`, this.domNode, 'first');
        }
    });
});
