define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/webmap/share-panel",
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    DynamicPanel,
    BorderContainer,
    reactApp,
    sharePanelComp,
) {
    return declare(
        [
            DynamicPanel,
            BorderContainer,
            _TemplatedMixin,
            _WidgetsInTemplateMixin,
        ],
        {
            constructor: function (options) {
                declare.safeMixin(this, options);

                this.makeComp = (contentNode, options) => {
                    reactApp.default(
                        sharePanelComp.default,
                        {
                            socialNetworksEnabled: options.socialNetworks,
                            display: options.display,
                            eventVisibility: options.eventVisibility
                        },
                        contentNode
                    );
                };
            },

            postCreate: function () {
                this.inherited(arguments);
            },

            show: function () {
                this.emit("pre-show");
                this.inherited(arguments);
            },

            hide: function () {
                this.emit("pre-hide");
                this.inherited(arguments);
            }
        }
    );
});
