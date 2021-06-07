define([
    'dojo/_base/declare',
    '@nextgisweb/pyramid/i18n!',
    "dojo/query",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-class",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./UserAvatar.hbs",
    "xstyle/css!./UserAvatar.css"
], function (
    declare,
    i18n,
    query,
    lang,
    array,
    domClass,
    _WidgetBase,
    _TemplatedMixin,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin],{
        templateString: i18n.renderTemplate(template),
        userName: undefined,
        links: {},
        constructor: function (options) {
            declare.safeMixin(this,options);
        },
        postCreate: function(){
            if (this.userName) this._setLetters();

            this.on("click", lang.hitch(this, function(e){
                e.stopPropagation();
                if (this.userAvatarMenu.style.display == "block"){
                    this.hideMenu();
                } else {
                    this.showMenu();
                }
            }));
            query(document.body).on("click", lang.hitch(this, function(){
                this.hideMenu();
            }));
        },
        showMenu: function(){
            this.userAvatarMenu.style.display = "block";
            domClass.add(this.domNode, "user-avatar--active");
        },
        hideMenu: function(){
            this.userAvatarMenu.style.display = "none";
            domClass.remove(this.domNode, "user-avatar--active");
        },
        _setLetters: function(){
            var nameLetters = "";
            array.forEach(this.userName.split(" "), function(string, index){
                if (index < 2) nameLetters += string.charAt(0);
            });
            this.userAvatarLabel.innerHTML = nameLetters;
        }
    });
});
