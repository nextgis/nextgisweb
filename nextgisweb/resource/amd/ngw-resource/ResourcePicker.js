define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dojo/dom-construct",
    "dijit/Dialog",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dojox/collections/Set",
    "./Tree",
    "ngw-pyramid/i18n!resource"
], function (
    declare,
    lang,
    Deferred,
    domConstruct,
    Dialog,
    Button,
    BorderContainer,
    set,
    Tree,
    i18n
) {
    return declare([Dialog], {
        title: i18n.gettext("Select resource"),

        buildRendering: function () {
            this.inherited(arguments);

            this.container = new BorderContainer({
                style: "width: 400px; height: 300px"
            }).placeAt(this);

            this.tree = new Tree({
                region: "center",
                style: "width: 100%; height: 100%;"
            }).placeAt(this.container);

            this.tree.on("click", lang.hitch(this, function () {
                this.btnOk.set("disabled", !this.checkItemAcceptance(this.tree.selectedItem));
            }));

            this.actionBar = domConstruct.create("div", {
                class: "dijitDialogPaneActionBar"
            }, this.containerNode);

            this.btnOk = new Button({
                label: i18n.gettext("OK"),
                disabled: true,
                onClick: lang.hitch(this, function () {
                    this._deferred.resolve(this.tree.get("selectedItem"));
                    this.hide();
                })
            }).placeAt(this.actionBar);
            
            new Button({
                label: i18n.gettext("Cancel"),
                onClick: lang.hitch(this, function () {
                    this._deferred.reject("No resource selected");
                    this.hide();
                })
            }).placeAt(this.actionBar);
        },

        checkItemAcceptance: function (itm) {
            if (itm === undefined || itm === null) { return false; }
            if (this.interface !== undefined && itm.interfaces.indexOf(this.interface) == -1) { return false; }
            if (this.interfaces !== undefined &&
                (set.intersection(itm.interfaces, this.interfaces).count == 0)) { return false; }
            if (this.cls !== undefined && itm.cls != this.cls) { return false; }
            if (this.clases !== undefined &&
                (set.intersection([itm.cls], this.clases).count == 0)) { return false; }

            return true;
        },

        pick: function () {
            this._deferred = new Deferred();
            this.show();
            return this._deferred;
        }
    });
});
