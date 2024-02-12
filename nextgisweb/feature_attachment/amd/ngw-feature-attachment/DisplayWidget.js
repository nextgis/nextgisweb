define([
    "dojo/_base/declare",
    "@nextgisweb/pyramid/i18n!",
    "ngw-feature-layer/DisplayWidget",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/feature-attachment/attachment-table",
], function (declare, { gettext }, DisplayWidget, reactApp, AttachmentTable) {
    return declare([DisplayWidget], {
        title: gettext("Attachments"),

        renderValue: function (value) {
            if (!value) {
                return false;
            }
            reactApp.default(
                AttachmentTable.default,
                {
                    attachments: value,
                    featureId: this.featureId,
                    resourceId: this.resourceId,
                    isSmall: this.compact,
                },
                this.domNode
            );
        },
    });
});
