/*global define, require, ngwConfig*/
define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/layout/ContentPane",
    // CodeMirror
    ngwConfig.assetUrl + "codemirror/lib/codemirror.js",
    "xstyle/css!" + ngwConfig.assetUrl + "codemirror/lib/codemirror.css"
], function (
    declare,
    domClass,
    domStyle,
    ContentPane
) {
    var CodeMirror = window.CodeMirror;

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

        _setModeAttr: function (value) {
            this._set("mode", value);
            if (this._cm) {
                var widget = this;
                require([
                    ngwConfig.assetUrl + "codemirror/mode/" + value + "/" + value + ".js"
                ], function () {
                    widget._cm.setOption("mode", value);
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