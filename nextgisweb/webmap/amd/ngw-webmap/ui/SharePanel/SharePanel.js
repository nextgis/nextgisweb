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
    sharePanelComp
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

                this.makeComp = (contentNode, options, eventVisibility) => {
                    reactApp.default(
                        sharePanelComp.default,
                        {
                            display: options.display,
                            eventVisibility,
                        },
                        contentNode
                    );
                };
            },

            postCreate: function () {
                this.inherited(arguments);
            },

            show: function () {
                this.inherited(arguments);
                const eventVisibility = "pre-show";
                this.makeComp(this.contentNode, this.options, eventVisibility);
            },

            hide: function () {
                const eventVisibility = "pre-hide";
                this.makeComp(this.contentNode, this.options, eventVisibility);
            },
        }
    );
});
