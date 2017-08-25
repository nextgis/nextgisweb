define([
    "dojo/Stateful",
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    //"dojo/_base/array",
    //"dojo/query",
    //"dojo/dom",
    //"dojo/dom-construct",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
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
    Stateful,
    declare,
    i18n,
    hbsI18n,
    //array,
    //query,
    //dom,
    //domConstruct,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ContentPane,
    BorderContainer,
    DropdownButton,
    DropDownMenu,
    MenuItem,
    Toolbar,
    template) {
    return declare([Stateful, BorderContainer,_TemplatedMixin, _WidgetsInTemplateMixin],{
        templateString: hbsI18n(template, i18n),
        constructor: function (options) {
            declare.safeMixin(this,options);
        },
        postCreate: function(){
        }
    });
});