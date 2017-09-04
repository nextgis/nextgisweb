define([
    'dojo/_base/declare',
    "dojo/on",
    "dojo/dom-construct",
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "openlayers/ol"
], function (declare, on, domConstruct, i18n, hbsI18n, ol) {
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
                innerHTML: "<button><span class='ol-control__icon material-icons'>home</span></button>",
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
