define([
    'dojo/_base/declare',
    "dojo/on",
    "dojo/dom-construct",
    "openlayers/ol",
    "@nextgisweb/pyramid/icon"
], function (
    declare,
    on,
    domConstruct,
    ol,
    icon
) {
    return declare(ol.control.Control, {
        element: undefined,
        target: undefined,
        tipLabel: undefined,

        constructor: function(options){
            var widget = this;

            this.inherited(arguments);
            declare.safeMixin(this,options);

            this.element = domConstruct.create("div", {
                class: "ol-control ol-unselectable",
                innerHTML: '<button><span class="ol-control__icon">' + icon.html({glyph: "home"}) + '</span></button>',
                title: this.tipLabel
            });

            on(this.element, "click", function(){
                widget.display._zoomToInitialExtent();
            });

            ol.control.Control.call(this, {
                 element: this.element,
                 target: this.target
            });
        }
    });
});
