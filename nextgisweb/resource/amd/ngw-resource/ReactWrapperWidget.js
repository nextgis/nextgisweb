define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/Deferred",
    "dijit/_WidgetBase",
    "@nextgisweb/gui/react-app",
], function (
    declare,
    lang,
    domStyle,
    Deferred,
    _WidgetBase,
    reactApp
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

            var storeClass = this.module.store;
            this.store = new storeClass(config);
            this.identity = storeClass.identity;

            var widgetClass = this.module.widget;
            this.title = widgetClass.title;
            this.order = widgetClass.order;
            this.activateOn = widgetClass.activateOn;
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

        serialize: function (data) {
            lang.setObject(this.store.identity, this.store.dump(), data);
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
