define([
    'dojo/_base/declare',
    "dojo/on",
    "dojo/dom-construct",
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "openlayers/ol",
    "xstyle/css!./EditingToolbar.css"
], function (declare, on, domConstruct, i18n, hbsI18n, ol) {
    return declare(ol.control.Control, {
        element: undefined,
        target: undefined,
        tipLabel: undefined,

        constructor: function(options){
            this.inherited(arguments);
            declare.safeMixin(this,options);

            this.element = domConstruct.create("div", {
                class: "edit-toolbar ol-hidden",
                innerHTML: ""
            });

            ol.control.Control.call(this, {
                 element: this.element,
                 target: this.target
            });
        }
    });
});
