define([
    "dojo/_base/declare",
    "dojo/dom-style",
    "dojo/promise/all",
    "dijit/_WidgetBase",
    "@nextgisweb/gui/react-app",
], function (declare, domStyle, all, _WidgetBase, reactApp) {
    return function (fcomp, { waitFor = [], props } = {}) {
        return declare([_WidgetBase], {
            app: undefined,
            props: props,

            _updateVisible: function (visible) {
                if (this.app) {
                    this.app.update({ visible });
                } else if (typeof fcomp === "string") {
                    // Lazy panel module loading
                    require([fcomp], (fcompMod) => {
                        fcomp = fcompMod.default;
                        this.runReactApp({ visible });
                    });
                } else {
                    this.runReactApp({ visible });
                }
            },

            buildRendering: function () {
                this.inherited(arguments);
                domStyle.set(this.domNode, "height", "100%");
            },

            show: function () {
                this._updateVisible(true);
            },

            hide: function () {
                this._updateVisible(false);
            },

            runReactApp: function ({ visible }) {
                const pm = this.display.panelsManager;
                all(waitFor).then(() => {
                    const props = {
                        display: this.display,
                        title: this.title,
                        close: () => {
                            pm._closePanel(pm.getPanel(pm._activePanelKey));
                        },
                        visible,
                    };
                    if (this.props) Object.assign(props, this.props);
                    this.app = reactApp.default(fcomp, props, this.domNode);
                });
            },
        });
    };
});
