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
                title: this.tipLabel
            });

            var link = domConstruct.create("a", {
                href: this.url,
                target: "_blank",
                class: "ol-control__btn",
                innerHTML: "<span class='ol-control__icon material-icons'>open_in_new</span>",
            }, this.element);


            ol.control.Control.call(this, {
                 element: this.element,
                 target: this.target
            });
        }
    });
});
