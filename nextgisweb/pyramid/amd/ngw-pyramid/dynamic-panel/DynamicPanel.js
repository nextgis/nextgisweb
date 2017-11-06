define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "dojo/query",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/_WidgetBase",
    "dojo/text!./DynamicPanel.hbs",
    "dijit/form/Select",
    "xstyle/css!./DynamicPanel.css"
], function (
    declare,
    i18n,
    hbsI18n,
    query,
    lang,
    array,
    dom,
    domConstruct,
    domClass,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    _WidgetBase,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],{
        templateString: hbsI18n(template, i18n),
        title: "",
        contentWidget: undefined,
        isOpen: false,
        withCloser: true,
        withOverlay: false,
        withTitle: true,
        constructor: function (options) {
            declare.safeMixin(this,options);
        },
        postCreate: function(){
            if (this.contentWidget)
                this.contentWidget.placeAt(this.contentNode);

            if (this.isOpen) this.show();

            if (this.withCloser)
                this._createCLoser();

            if (this.withOverlay)
                this._createOverlay();

            if (!this.withTitle){
                domClass.add(this.domNode, "dynamic-panel--notitle");
            }
        },
        show: function(){
            this.isOpen = true;
            this.domNode.style.display = "block";
            if (this.overlay) this.overlay.style.display = "block";
            if (this.getParent()) this.getParent().resize();
            this.emit("shown");
        },
        hide: function(){
            this.isOpen = false;
            this.domNode.style.display = "none";
            if (this.getParent()) this.getParent().resize();
            if (this.overlay) this.overlay.style.display = "none";
            this.emit("closed");
        },
        _createCLoser: function(){
            this.closer = domConstruct.create("span", {
                class: "dynamic-panel__closer material-icons material-icons--link icon--link",
                innerHTML: "close"
            });
            domConstruct.place(this.closer, this.domNode);

            query(this.closer).on("click", lang.hitch(this, function() {
               this.hide();
            }));
        },
        _createOverlay: function(){
            this.overlay = domConstruct.create("div", {
                class: "overlay"
            });
            domConstruct.place(this.overlay, document.body);
            query(this.overlay).on("click", lang.hitch(this, function() {
               this.hide();
            }));
        }
    });
});
