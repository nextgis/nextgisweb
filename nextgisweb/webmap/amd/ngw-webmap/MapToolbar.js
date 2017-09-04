define([
    'dojo/_base/declare',
    "dojo/dom-construct",
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    'ngw-webmap/MapToolbarItems',
    "openlayers/ol",
    "xstyle/css!./template/resources/MapToolbar.css"
], function (declare, domConstruct, i18n, hbsI18n, MapToolbarItems, ol) {
    return declare( ol.control.Control, {
        element: undefined,
        target: undefined,

        constructor: function(options){
            declare.safeMixin(this,options);

            this.element = domConstruct.create("div", {
                class: "map-toolbar"
            });

            this.items = new MapToolbarItems({
                display: this.display
            });

            this.items.placeAt(this.element);

            ol.control.Control.call(this, {
                 element: this.element,
                 target: this.target
            });
        }
    });
});
