define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojox/layout/TableContainer",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/feature_description/description-editor",
    "@nextgisweb/pyramid/i18n!",
    // css
    "xstyle/css!./resource/EditorWidget.css",
], function (
    declare,
    domClass,
    TableContainer,
    reactApp,
    DescriptionEditor,
    i18n
) {
    return declare([TableContainer], {
        title: i18n.gettext("Description"),
        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-feature-description-EditorWidget");

            this.component = reactApp.default(
                DescriptionEditor.default,
                { store: this.store, extension: this.extension },
                this.domNode
            );
        },
        destroy: function () {
            if (this.component) {
                this.component.unmount();
            }
            this.component = null;
        },

        // Rewrite default widget methods to use feature store instead
        get: function () {
            return
        },
        set: function () {
            return;
        }
    });
});
