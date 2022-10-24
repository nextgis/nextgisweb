define([
    "dojo/_base/declare",
    "@nextgisweb/pyramid/i18n!",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/form/CheckBox",
    "dijit/form/SimpleTextarea",
    "dojo/_base/lang",
    "dojo/promise/all",
    "ngw-webmap/Permalink",
    "dojox/dtl/_base",
    "dojox/dtl/Context",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/settings!",
    "@nextgisweb/webmap/icon",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/webmap/share-panel",
], function (
    declare,
    i18n,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    DynamicPanel,
    BorderContainer,
    Button,
    TextBox,
    CheckBox,
    SimpleTextarea,
    lang,
    all,
    Permalink,
    dtl,
    dtlContext,
    api,
    settings,
    icon,
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
