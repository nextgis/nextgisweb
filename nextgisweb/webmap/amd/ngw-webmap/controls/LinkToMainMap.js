define([
    "dojo/_base/declare",
    "dojo/on",
    "dojo/dom-construct",
    "openlayers/ol",
    "@nextgisweb/pyramid/icon",
], function (declare, on, domConstruct, ol, icon) {
    return declare(ol.control.Control, {
        element: undefined,
        target: undefined,
        tipLabel: undefined,

        constructor: function (options) {
            this.inherited(arguments);
            declare.safeMixin(this, options);

            this.element = domConstruct.create("div", {
                class: "ol-control ol-unselectable",
                innerHTML:
                    '<button><span class="ol-control__icon">' +
                    icon.html({ glyph: "open_in_new" }) +
                    "</span></button>",
                title: this.tipLabel,
            });

            on(this.element, "click", () => {
                window.open(this.url, "_blank");
            });

            ol.control.Control.call(this, {
                element: this.element,
                target: this.target,
            });
        },
    });
});
