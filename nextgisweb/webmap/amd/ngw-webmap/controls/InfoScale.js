define([
    'dojo/_base/declare',
    "dojo/on",
    "dojo/dom-construct",
    "dojo/number",
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "openlayers/ol"
], function (declare, on, domConstruct, number, i18n, hbsI18n, ol) {
    return declare(ol.control.Control, {
        element: undefined,
        target: undefined,
        display: undefined,

        constructor: function(options){
            var widget = this;

            this.inherited(arguments);
            declare.safeMixin(this,options);

            this.element = domConstruct.create("span", {
                class: "ol-control ol-scaleInfo ol-unselectable"
            });

            widget.display.map.watch("resolution", function (attr, oldVal, newVal) {
                 widget.element.innerHTML = "1 : " + number.format(
                     widget.display.map.getScaleForResolution(
                         newVal,
                         widget.display.map.olMap.getView().getProjection().getMetersPerUnit()
                     ), {places: 0});
            });


            ol.control.Control.call(this, {
                 element: this.element,
                 target: this.target
            });
        }
    });
});
