define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/io-query',
    'dojo/promise/all',
    'dijit/Dialog',
    'dijit/form/TextBox',
    'openlayers/ol',
    'ngw-pyramid/i18n!webmap'
], function (declare, array, lang, domConstruct, ioQuery, all, Dialog, TextBox, ol, i18n) {
    return declare(null, {
        constructor: function (Display) {
            this.display = Display;
        },

        showPermalink: function () {
            all({
                visbleItems: this.display.getVisibleItems(),
                map: this.display._mapDeferred
            }).then(
                lang.hitch(this, function (results) {
                    var visibleStyles = array.map(
                        results.visbleItems,
                        lang.hitch(this, function (i) {
                            return this.display.itemStore.dumpItem(i).styleId;
                        })
                    );

                    var center = ol.proj.toLonLat(this.display.map.olMap.getView().getCenter());
                    var queryStr = ioQuery.objectToQuery({
                        base: this.display._baseLayer.name,
                        lon: center[0].toFixed(4),
                        lat: center[1].toFixed(4),
                        angle: this.display.map.olMap.getView().getRotation(),
                        zoom: this.display.map.olMap.getView().getZoom(),
                        styles: visibleStyles.join(",")
                    });

                    var permalink = window.location.origin
                        + window.location.pathname
                        + "?" + queryStr;

                    var permalinkDialog = new Dialog({
                        title: i18n.gettext("Permalink"),
                        draggable: false,
                        autofocus: false
                    });

                    var permalinkContent = new TextBox({
                        readOnly: false,
                        selectOnClick: true,
                        value: decodeURIComponent(permalink),
                        style: {
                            width: "300px"
                        }
                    });

                    domConstruct.place(
                        permalinkContent.domNode,
                        permalinkDialog.containerNode,
                        "first"
                    );
                    permalinkContent.startup();
                    permalinkDialog.show();
                }),
                function (error) {
                    console.log(error);
                }
            );
        }
    });
});
