define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/layout/ContentPane",
    "dijit/TitlePane",
    "dojo/dom-style"
], function (
    declare,
    _WidgetBase,
    ContentPane,
    TitlePane,
    domStyle
) {
    return declare("ngw.CompositeTitlePaneMixin", [], {
        placeWidget: function (key, widget) {
            var pane = new TitlePane({title: widget.title});
            this.watch("disabled", function (attr, oldVal, newVal) {
                widget.set("disabled", newVal);
            });
            widget.placeAt(pane);
            pane.placeAt(this.domNode).startup();
            domStyle.set(pane.domNode, "margin", "0 0 1ex 0");
        }
    });
});
