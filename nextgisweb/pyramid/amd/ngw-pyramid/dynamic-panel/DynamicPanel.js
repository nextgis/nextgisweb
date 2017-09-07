define([
    "dojo/Evented",
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "dojo/query",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/dom-construct",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dojo/text!./DynamicPanel.hbs",
    "dijit/layout/BorderContainer",
    "dijit/form/Select",
    "xstyle/css!./DynamicPanel.css"
], function (
    Evented,
    declare,
    i18n,
    hbsI18n,
    query,
    lang,
    array,
    dom,
    domConstruct,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ContentPane,
    BorderContainer,
    template) {
    return declare([ContentPane,_TemplatedMixin, _WidgetsInTemplateMixin],{
        templateString: hbsI18n(template, i18n),
        title: "",
        contentWidget: undefined,
        isOpen: false,
        withCloser: true,
        constructor: function (options) {
            declare.safeMixin(this,options);
        },
        postCreate(){
            this.contentWidget.placeAt(this.contentNode);
            if (this.isOpen) this.show();

            if (this.withCloser)
                this._createCLoser();
        },
        show(){
            this.isOpen = true;
            this.containerNode.style.display = "block";
            if (this.getParent()) this.getParent().resize();
            this.emit("shown");
        },
        hide(){
            this.isOpen = false;
            this.containerNode.style.display = "none";
            if (this.getParent()) this.getParent().resize();
            this.emit("closed");
        },
        _createCLoser(){
            this.closer = domConstruct.create("span", {
                class: "dynamic-panel__closer material-icons material-icons--link",
                innerHTML: "close"
            });
            domConstruct.place(this.closer, this.domNode);

            query(this.closer).on("click", lang.hitch(this, function() {
               this.hide();
            }));
        }
    });
});