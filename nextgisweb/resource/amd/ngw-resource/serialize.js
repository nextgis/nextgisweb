/* globals define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/query",
    "dojo/Deferred",
    "dojo/when",
    "dojo/promise/all",
    "dijit/registry"
], function (
    declare,
    lang,
    array,
    query,
    Deferred,
    when,
    all,
    registry
) {
    var Mixin = declare([], {

        constructor: function () {
            this.serattrmap = [];
        },

        validateData: function (errback) {
            var deferred = new Deferred(),
                success = true;

            array.forEach(this.serattrmap, function (i) {
                if (i.widget.validate !== undefined) {
                    i.widget._hasBeenBlurred = true;
                    success = i.widget.validate() && success;
                }
            });

            if (this.validateDataInMixin !== undefined) {
                success = success && this.validateDataInMixin(errback);
            }

            deferred.resolve(success);
            return deferred;
        },

        serialize: function (data) {
            var promises = [];

            array.forEach(this.serattrmap, function (i) {
                var value = i.widget.get("value");
                lang.setObject(i.key, value, data);
            });

            if (this.serializeInMixin !== undefined) {
                promises.push(when(this.serializeInMixin(data)));
            }
            
            return all(promises);
        },

        deserialize: function (data) {
            var deferred = new Deferred();

            array.forEach(this.serattrmap, function (i) {
                var value = lang.getObject(i.key, false, data);
                i.widget.set("value", value);
            });

            if (this.deserializeInMixin !== undefined) {
                this.deserializeInMixin(data);
            }

            deferred.resolve();

            return deferred;
        },

        postCreate: function () {
            this.inherited(arguments);
            
            array.forEach(query("*[data-ngw-serialize]", this.domNode), function (node) {
                var widget = registry.byId(node.id),
                    attr = node.getAttribute("data-ngw-serialize");
                if (widget === undefined) {
                    console.warn("Could not find corresponding widget for node:", node);
                } else {
                    var current = node, key = attr;
                    do {
                        var a = current.getAttribute("data-ngw-serialize-prefix");
                        if (a) { key = a + "." + key; }
                        current = current.parentNode;
                    } while (current !== this.domNode.parentNode);
                    this.serattrmap.push({ key: key, widget: widget });
                }
            }, this);
        }
    });

    return {
        Mixin: Mixin
    };
});
