define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojox/layout/TableContainer",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/feature_attachment/attachment-editor",
    "@nextgisweb/pyramid/i18n!",
    // css
    "xstyle/css!./resource/EditorWidget.css",
], function (
    declare,
    domClass,
    TableContainer,
    reactApp,
    AttachmentEditor,
    i18n
) {
    return declare([TableContainer], {
        title: i18n.gettext("Attachments"),

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-feature-attachment-EditorWidget");

            this.component = reactApp.default(
                AttachmentEditor.default,
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
            return;
        },
        set: function () {
            return;
        },
    });
});
