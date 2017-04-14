define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-style"
], function (
    declare,
    array,
    domConstruct,
    domStyle
) {
    return declare([], {
        _setErrorAttr: function (value) {
            if ( !this.errorNode ) {
                this.errorNode = domConstruct.create("div", null, this.domNode, "first");
            }

            if ( !this.errorListNode ) {
                this.errorListNode = domConstruct.create("ul", {class: "ngwModelWidgetError"}, this.errorNode);
            }
            this.errorListNode.innerHTML = "";
            domStyle.set(this.errorListNode, "display", (value === null || value.length === 0) ? "none" : "block");
            
            var widget = this;
            array.forEach(value, function (error) {
                domConstruct.create("li", {innerHTML: error.message}, widget.errorListNode);
            });
        }
    });
});
