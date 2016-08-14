define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/io-query',
    'dojo/promise/all',
    'dijit/Dialog',
    'dijit/form/TextBox',
    'ngw/utils/make-singleton',
    'openlayers/ol',
    'ngw-pyramid/i18n!webmap'
], function (declare, array, lang, domConstruct, ioQuery, all, Dialog, TextBox,
             MakeSingleton, ol, i18n) {
    return MakeSingleton(declare('ngw-webmap.Permalink', [], {
        constructor: function (Display) {
            this.display = Display;
        },

        showPermalink: function () {
            all({
                visbleItems: this.display.getVisibleItems(),
                map: this.display._mapDeferred
            }).then(
                lang.hitch(this, function (gettingVisibleItemsResults) {
                    this._showPermalink(gettingVisibleItemsResults.visbleItems);
                }),
                function (error) {
                    console.log(error);
                }
            );
        },

        _showPermalink: function (visbleItems) {
            var permalinkText = this._getPermalink(visbleItems);
            this._showPermalinkDialog(permalinkText);
        },

        _getPermalink: function (visbleItems) {
            var visibleStyles, center, queryStr;

            visibleStyles = array.map(
                visbleItems,
                lang.hitch(this, function (i) {
                    return this.display.itemStore.dumpItem(i).styleId;
                })
            );

            center = ol.proj.toLonLat(this.display.map.olMap.getView().getCenter());

            queryStr = ioQuery.objectToQuery({
                base: this.display._baseLayer.name,
                lon: center[0].toFixed(4),
                lat: center[1].toFixed(4),
                angle: this.display.map.olMap.getView().getRotation(),
                zoom: this.display.map.olMap.getView().getZoom(),
                styles: visibleStyles.join(",")
            });

            return window.location.origin
                + window.location.pathname
                + "?" + queryStr;
        },

        _showPermalinkDialog: function (permalinkText) {
            var permalinkDialog, permalinkContent;

            permalinkDialog = new Dialog({
                title: i18n.gettext("Permalink"),
                draggable: false,
                autofocus: false,
                onHide: function () {
                    permalinkDialog.destroy();
                }
            });

            permalinkContent = new TextBox({
                readOnly: false,
                selectOnClick: true,
                value: decodeURIComponent(permalinkText),
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
        }
    }));
});
