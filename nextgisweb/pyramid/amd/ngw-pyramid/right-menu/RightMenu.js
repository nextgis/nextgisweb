define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!pyramid',
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/on",
    "xstyle/css!./RightMenu.css"
], function (
    declare,
    i18n,
    _TemplatedMixin,
    _WidgetBase,
    _WidgetsInTemplateMixin,
    DynamicPanel,
    domConstruct,
    array,
    on
) {
    return declare([DynamicPanel],{
        user: undefined,
        items: [],
        logoutLink: undefined,
        loginLink: undefined,
        constructor: function (options) {
            declare.safeMixin(this,options);

            var widget = this;

            this.contentWidget = new (declare([_WidgetBase], {
                 buildRendering: function(){
                     if (widget.items.length) {
                         this.domNode = domConstruct.create('div', {
                             class: "list"
                         });
                         array.forEach(widget.items, function(item){
                             domConstruct.create('a', {
                                 class: "list__item",
                                 innerHTML: item.text,
                                 href: item.link
                             }, this.domNode);
                         }, this);
                     }
                }
            }));
        },
        postCreate: function(){
            this.inherited(arguments);

            var widget = this;

            if (widget.user){
               domConstruct.create('div', {
                   class: "right-menu__user",
                   innerHTML: "<span class='right-menu__user-name'>" + widget.user + "</span>" +
                   "<a href='" + widget.logoutLink + "' class='right-menu__user-logout material-icons icon--link' title='" +
                   i18n.gettext("Sign out") + "'>exit_to_app</span>"
               }, widget.titleNode);
            } else {
                domConstruct.create('div', {
                   class: "right-menu__user",
                   innerHTML: "<a href='" + widget.loginLink + "' class='right-menu__user-login'>" + i18n.gettext("Sign in") + "</span>"
               }, widget.titleNode);
            }

            on(document.getElementById("rightMenuIcon"), 'click', function(){
                widget.show();
            });
        }
    });
});
