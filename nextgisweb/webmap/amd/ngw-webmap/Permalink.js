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
    return {
        getPermalink: function (display, visbleItems, options) {
            var urlWithoutParams, visibleStyles, center, queryStr,
                origin, pathname, queryObj;

            options = options ? options : {};

            visibleStyles = array.map(
                visbleItems,
                function (i) {
                    return display.itemStore.dumpItem(i).styleId;
                }
            );

            center = options.center ? options.center : ol.proj.toLonLat(display.map.olMap.getView().getCenter());

            queryObj = {
                base: display._baseLayer.name,
                lon: center[0].toFixed(4),
                lat: center[1].toFixed(4),
                angle: display.map.olMap.getView().getRotation(),
                zoom: display.map.olMap.getView().getZoom(),
                styles: visibleStyles.join(",")
            };

            if (options.additionalParams) {
                lang.mixin(queryObj, options.additionalParams);
            }

            queryStr = ioQuery.objectToQuery(queryObj);

            if (options.urlWithoutParams) {
                urlWithoutParams = options.urlWithoutParams;
            } else {
                origin = options.origin ? options.origin : window.location.origin;
                pathname = options.pathname ? options.pathname : window.location.pathname;
                urlWithoutParams = origin + pathname;
            }

            return urlWithoutParams + "?" + queryStr;
        }
    };
});
