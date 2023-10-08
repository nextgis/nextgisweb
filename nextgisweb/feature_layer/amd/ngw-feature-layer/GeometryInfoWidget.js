define([
    "dojo/_base/declare",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/feature-layer/geometry-info",
    "@nextgisweb/pyramid/i18n!",
    "ngw-feature-layer/DisplayWidget",
], function (declare, reactApp, GeometryInfoComp, i18n, DisplayWidget) {
    return declare(DisplayWidget, {
        title: i18n.gettext("Geometry"),

        renderValue: function (layerId, featureId) {
            reactApp.default(
                GeometryInfoComp.default,
                {
                    layerId,
                    featureId,
                },
                this.domNode
            );
        },
    });
});
