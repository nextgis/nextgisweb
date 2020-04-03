define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dojo/dom-construct",
    "dijit/Dialog",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dojox/collections/Set",
    "ngw-pyramid/i18n!tmsclient"
], function (
    declare,
    lang,
    Deferred,
    domConstruct,
    Dialog,
    Tree,
    ObjectStoreModel,
    Button,
    BorderContainer,
    set,
    i18n
) {
    return declare([Dialog], {
        title: i18n.gettext("Select layer"),

        constructor: function (options) {
            this.inherited(arguments);

            this.tree = new Tree({
                model: new ObjectStoreModel({
                    store: options.store,
                    getLabel: function (item) {
                        return item.layer + ' (' + item.description + ')';
                    },
                    mayHaveChildren: function () { return false; }
                }),
                region: "center",
                style: "width: 100%; height: 100%;"
            });
        },

        buildRendering: function () {
            this.inherited(arguments);

            this.container = new BorderContainer({
                style: "width: 400px; height: 300px"
            }).placeAt(this);

            this.tree.placeAt(this.container);

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
                    this._deferred.reject("No layer selected");
                    this.hide();
                })
            }).placeAt(this.actionBar);
        },

        checkItemAcceptance: function (itm) {
            return !!itm;
        },

        pick: function () {
            this._deferred = new Deferred();
            this.show();
            return this._deferred;
        }
    });
});
