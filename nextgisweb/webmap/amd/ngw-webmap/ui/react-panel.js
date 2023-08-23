define([
    "dojo/_base/declare",
    "dojo/dom-style",
    "dojo/promise/all",
    "dijit/_WidgetBase",
    "@nextgisweb/gui/react-app",
], function (declare, domStyle, all, _WidgetBase, reactApp) {
    return function (fcomp, { waitFor = [] } = {}) {
        return declare([_WidgetBase], {
            app: undefined,

            buildRendering: function () {
                this.inherited(arguments);
                domStyle.set(this.domNode, "height", "100%");
            },

            show: function () {
                if (this.app) {
                    this.app.update({ visible: true });
                } else if (typeof fcomp === "string") {
                    // Lazy panel module loading
                    require([fcomp], (fcompMod) => {
                        fcomp = fcompMod.default;
                        this.runReactApp({ visible: true });
                    });
                } else {
                    this.runReactApp({ visible: true });
                }
            },

            hide: function () {
                this.app.update({ visible: false });
            },

            runReactApp: function ({ visible }) {
                const pm = this.display.panelsManager;
                all(waitFor).then(() => {
                    this.app = reactApp.default(
                        fcomp,
                        {
                            display: this.display,
                            title: this.title,
                            close: () => pm._closePanel(pm.getPanel("layers")),
                            visible,
                        },
                        this.domNode
                    );
                });
            },
        });
    };
});
