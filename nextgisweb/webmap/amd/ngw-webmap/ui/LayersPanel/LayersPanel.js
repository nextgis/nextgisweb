define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    "dijit/form/DropDownButton",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/Toolbar",
    "dojo/text!./LayersPanel.hbs",

    //templates

    "dijit/form/Select",
    "xstyle/css!./LayersPanel.css"
], function (
    declare,
    i18n,
    hbsI18n,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    DynamicPanel,
    BorderContainer,
    DropdownButton,
    DropDownMenu,
    MenuItem,
    Toolbar,
    template) {
    return declare([DynamicPanel, BorderContainer,_TemplatedMixin, _WidgetsInTemplateMixin],{
        constructor: function (options) {
            declare.safeMixin(this,options);

            this.contentWidget = new (declare([BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: hbsI18n(template, i18n),
                region: 'top',
                gutters: false
            }));
        }
    });
});