/*global define, require, ngwConfig*/
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dojo/dom-class',
    // CodeMirror
    ngwConfig.assetUrl + "codemirror/lib/codemirror.js",
    'xstyle/css!' + ngwConfig.assetUrl + 'codemirror/lib/codemirror.css'
], function (declare, _WidgetBase, domClass) {
    var CodeMirror = window.CodeMirror;

    return declare(_WidgetBase, {
        postCreate: function () {
            this.inherited(arguments);

            if (this.autoHeight === true) {
                domClass.add(this.domNode, "CodeMirror-autoHeight");
            }

            this._cm = new CodeMirror(this.domNode, {
                lineNumbers: this.lineNumbers || false
            });

            if (this.mode) { this.set("mode", this.mode); }
            if (this.value) { this.set("value", this.value); }
        },

        startup: function () {
            this.inherited(arguments);
            this._cm.refresh();
        },

        _setModeAttr: function (value) {
            this._set('mode', value);
            if (this._cm) {
                var widget = this;
                require([
                    ngwConfig.assetUrl + "codemirror/mode/" + value + "/" + value + ".js"
                ], function () {
                    widget._cm.setOption('mode', value);
                });
            }
        },

        _getValueAttr: function () {
            return this._cm ? this._cm.getValue() : this.value;
        },

        _setValueAttr: function (value) {
            this._set('value', value);

            if (this._cm) {
                this._cm.doc.setValue(value);
            }
        }
    });

});