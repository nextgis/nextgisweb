define([
    "dojo/_base/declare",
    "dijit/TitlePane",
    "dojo/dom-style"
], function (
    declare,
    TitlePane,
    domStyle
) {
    // Mixin обеспечивающей расположение под-виджетов Composite на
    // dijit/form/TitlePane - под одной на под-виждет.

    return declare([], {
        placeWidget: function (key, widget) {
            var pane = new TitlePane({
                title: widget.title,
                open: widget.hasData()
            });
            this.watch("disabled", function (attr, oldVal, newVal) {
                widget.set("disabled", newVal);
            });
            widget.placeAt(pane);
            pane.placeAt(this).startup();
            domStyle.set(pane.domNode, "margin", "0 0 1ex 0");
        }
    });
});
