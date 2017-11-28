define([
    "dojo/Stateful",
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "dojo/_base/array",
    "dojo/query",
    "dojo/dom-construct",
    "dijit/_TemplatedMixin",
    "dijit/layout/ContentPane",
    "dojo/text!./NavigationMenu.hbs",
    "dijit/layout/BorderContainer",
    "xstyle/css!./NavigationMenu.css"
], function (
    Stateful,
    declare,
    i18n,
    hbsI18n,
    array,
    query,
    domConstruct,
    _TemplatedMixin,
    ContentPane,
    template
) {
    return declare([Stateful, ContentPane,_TemplatedMixin],{
        templateString: hbsI18n(template, i18n),
        items: [], // array of menu item. {name: "name", icon: "icon", value: "value"}
        value: undefined, //selected item
        constructor: function (options) {
            declare.safeMixin(this,options);
        },
        postCreate: function(){
            this._render();
        },
        _render: function(){
            array.forEach(this.items, function (item) {
                 var widget = this,
                     itemEl,
                     itemActiveClass = (this.value === item.value) ? "active" : "";

                 itemEl = domConstruct.create("div", {
                     innerHTML: '<span class="navigation-menu__icon material-icons">' + item.icon + '</span>',
                     className: "navigation-menu__item " + itemActiveClass,
                     title: item.title,
                     onclick: function(e){
                         if (widget.value === item.value)
                             widget.reset();
                         else
                            widget.activateItem(item.value, this);
                     }
                 }, this.domNode);

                 itemEl.setAttribute("data-item-value", item.value);

            }, this);
        },
        activateItem: function(value, node){
            if (this.value) this.reset();
            this.set("value", value);
            query(node).addClass('active');
        },
        reset: function(){
            this.set("value", undefined);
            query(".active", this.domNode).removeClass("active");
        }
    });
});
