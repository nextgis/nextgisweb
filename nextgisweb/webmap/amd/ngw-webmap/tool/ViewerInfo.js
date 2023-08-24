define([
    "dojo/_base/declare",
    "./Base",
    "openlayers/ol",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/webmap/map-viewer-info",
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/pyramid/icon",
    "xstyle/css!./resources/Zoom.css",
], function (declare, Base, ol, reactApp, MapViewerInfoComp, i18n, icon) {
    return declare(Base, {
        mapViewerInfoCompDomNode: undefined,
        customCssClass: "viewer-info-tool",

        constructor: function () {
            this.label = i18n.gettext("Show cursor coordinates / extent");
            this.customIcon =
                '<span class="ol-control__icon">' +
                icon.html({ glyph: "location_searching" }) +
                "</svg></span>";
        },

        activate: function () {
            if (!this.mapViewerInfoCompDomNode) {
                const domNode = this.toolbarBtn.domNode;
                const newNode = document.createElement("div");
                newNode.classList.add("viewer-info");
                domNode.after(newNode);
                this.mapViewerInfoCompDomNode = newNode;
            }
            this.makeComp(true);
        },

        deactivate: function () {
            this.makeComp(false);
        },

        makeComp: function (show) {
            const olMap = this.display.map.olMap;
            reactApp.default(
                MapViewerInfoComp.default,
                {
                    show,
                    map: olMap,
                },
                this.mapViewerInfoCompDomNode
            );
        },
    });
});
