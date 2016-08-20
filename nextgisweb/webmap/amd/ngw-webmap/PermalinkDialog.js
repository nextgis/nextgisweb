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
    'ngw-webmap/Permalink',
    'ngw-pyramid/i18n!webmap'
], function (declare, array, lang, domConstruct, ioQuery, all, Dialog, TextBox,
             MakeSingleton, ol, Permalink, i18n) {
    return MakeSingleton(declare('ngw-webmap.PermalinkDialog', [], {
        constructor: function (Display) {
            this.display = Display;
        },

        show: function () {
            var permalinkUrl;

            all({
                visbleItems: this.display.getVisibleItems(),
                map: this.display._mapDeferred
            }).then(
                lang.hitch(this, function (gettingVisibleItemsResults) {
                    permalinkUrl = Permalink.getPermalink(this.display, gettingVisibleItemsResults.visbleItems);
                    this._showPermalinkDialog(permalinkUrl);
                }),
                function (error) {
                    console.log(error);
                }
            );
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
