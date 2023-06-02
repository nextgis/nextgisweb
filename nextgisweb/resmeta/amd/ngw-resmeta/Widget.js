define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dojo/Deferred",
    "@nextgisweb/pyramid/i18n!resmeta",
    "@nextgisweb/resmeta/editor",
    "@nextgisweb/gui/react-app",
], function (declare, _WidgetBase, Deferred, i18n, editor, reactApp) {
    return declare("ngw.resmeta.Widget", [_WidgetBase], {
        prefix: "resmeta",
        title: i18n.gettext("Metadata"),
        order: 100,

        constructor: function () {
            this.store = new editor.EditorStore();
        },

        buildRendering: function () {
            this.inherited(arguments);
            reactApp.default(
                editor.EditorWidget,
                { store: this.store },
                this.domNode
            );
        },

        validateData: function (errback) {
            var deferred = new Deferred();
            deferred.resolve(true);
            return deferred;
        },

        serialize: function (data) {
            data["resmeta"] = this.store.dump();
            var deferred = new Deferred();
            deferred.resolve(true);
            return deferred;
        },

        deserialize: function (data) {
            this.store.load({ items: data.resmeta.items });
            var deferred = new Deferred();
            deferred.resolve(true);
            return deferred;
        },
    });
});
