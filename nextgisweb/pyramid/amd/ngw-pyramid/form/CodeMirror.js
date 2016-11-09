/*global define, require, ngwConfig*/
define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/layout/ContentPane",
    // CodeMirror
    "codemirror/lib/codemirror",
    "xstyle/css!codemirror/lib/codemirror.css"
], function (
    declare,
    domClass,
    domStyle,
    ContentPane,
    CodeMirror
) {
    return declare(ContentPane, {

        postCreate: function () {
            this.inherited(arguments);

            domStyle.set(this.domNode, "padding", "0");

            this._cm = new CodeMirror(this.domNode, {
                lineNumbers: this.lineNumbers || false,
                readOnly: this.readonly || false
            });

            if (this.autoHeight === true) {
                domClass.add(this.domNode, "CodeMirror-autoHeight");
            } else {
                var node = this._cm.getWrapperElement();
                domStyle.set(node, "border", "none");
                domStyle.set(node, "width", "100%");
                domStyle.set(node, "height", "100%");
            }

            if (this.mode) { this.set("mode", this.mode); }
            if (this.lang) { this.set("lang", this.lang); }
            if (this.value) { this.set("value", this.value); }
        },

        startup: function () {
            this.inherited(arguments);
            this._cm.refresh();
        },

        resize: function () {
            this.inherited(arguments);
            this._cm.refresh();
        },

        _setLangAttr: function (value) {
            this._set("lang", value);
            if (this._cm) {
                var widget = this;
                require([
                    "codemirror/mode/" + value + "/" + value
                ], function () {
                    widget._cm.setOption("mode", (widget.get("mode") || value));
                });
            }
        },

        _getValueAttr: function () {
            return this._cm ? this._cm.getValue() : this.value;
        },

        _setValueAttr: function (value) {
            this._set("value", value);
            if (this._cm) { this._cm.doc.setValue(value); }
        }
    });

});
