define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/Deferred",
    "dijit/_WidgetBase",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/resource/util/compat-mobx",
], function (
    declare,
    lang,
    domStyle,
    Deferred,
    _WidgetBase,
    reactApp,
    compatMobx
) {
    return declare([_WidgetBase], {
        identity: undefined,
        title: undefined,
        order: undefined,
        activateOn: undefined,

        module: undefined,
        entrypoint: undefined,

        constructor: function (props) {
            var composite = props.composite;
            var config = lang.clone(composite.config[this.entrypoint]);
            delete config.cls;

            config.composite = props.composite;
            config.operation = props.composite.operation;

            const storeClass = this.module.store;
            this.store = new storeClass(config);
            this.identity = storeClass.identity;

            var widgetClass = this.module.widget;
            this.title = widgetClass.title;
            this.order = widgetClass.order;
            this.activateOn = widgetClass.activateOn;

            if (props.composite.operation === "create") {
                const suggests = Object.prototype.hasOwnProperty.call(
                    this.store,
                    "suggestedDisplayName"
                );
                if (suggests) {
                    let reset = null;
                    compatMobx.autorun(() => {
                        const dn = this.store.suggestedDisplayName;
                        if (dn) {
                            reset = props.composite.suggestDN(dn);
                        } else {
                            reset && reset();
                            reset = null;
                        }
                    });
                }
            }
        },

        buildRendering: function () {
            this.inherited(arguments);
            domStyle.set(this.domNode, "height", "100%");

            reactApp.default(
                this.module.widget,
                { store: this.store },
                this.domNode
            );
        },

        validateData: function () {
            var deferred = new Deferred();
            deferred.resolve(this.store.isValid);
            return deferred;
        },

        serialize: function (data, lunkwill) {
            const result = this.store.dump({ lunkwill });
            if (result !== undefined) {
                const identity = this.store.identity;
                const current = lang.getObject(identity, false, data);
                if (current !== undefined) lang.mixin(result, current);
                lang.setObject(identity, result, data);
            }
            var deferred = new Deferred();
            deferred.resolve(true);
            return deferred;
        },

        deserialize: function (data) {
            this.store.load(
                lang.getObject(this.store.identity, undefined, data)
            );
            var deferred = new Deferred();
            deferred.resolve(true);
            return deferred;
        },
    });
});
