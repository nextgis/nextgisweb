define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dijit/_WidgetBase"
], function (
    declare,
    domClass,
    _WidgetBase
) {
    return declare([_WidgetBase], {
        buildRendering: function () { 
            this.inherited(arguments);
            if (this.compact) { domClass.add(this.domNode, "compact"); }
        },

        renderValue: function () { /* abstract */ }
    });
});