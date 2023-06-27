define([
    "dojo/_base/declare", "ngw-pyramid/dynamic-panel/DynamicPanel",
    "@nextgisweb/gui/react-app", "@nextgisweb/webmap/bookmarks-panel",
    "dijit/layout/BorderContainer"
], function (
    declare, DynamicPanel,
    reactApp, bookmarksPanelComp,
    BorderContainer
) {
    return declare([DynamicPanel, BorderContainer], {
        bookmarkLayerId: undefined,
        constructor: function (options) {
            declare.safeMixin(this, options);

            this.makeComp = (contentNode, options) => {
                reactApp.default(
                    bookmarksPanelComp.default,
                    {
                        display: options.display,
                        bookmarkLayerId: this.bookmarkLayerId
                    },
                    contentNode
                );
            };
        }
    });
});
