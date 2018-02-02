/**
 * Mixin that adds functionality to memory store to support DnD ordering.
 * Without this, DnD works, but the items are inserted into the array in the wrong order.
 *
 * Usage: var Store = declare([Memory, OrderedStoreMixin]);
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2013 MicahStevens
**/

define([
    "dojo/_base/declare",
    "dojo/_base/lang"
], function (
    declare,
    lang
) {
    return declare("OrderedStoreMixin", [], {
        ordinal: 'ordinal', // field to sort by

        put: function (object, options) {
            // honor order if present
            options = options || {};
            if (options.before !== undefined || !object.order) {
                // if options.before is provided or this item doesn't have any order,
                // calculate a new one
                var before = object[this.ordinal];
                object[this.ordinal] = this.calculateOrder(object, options.before, this.ordinal);
            }
            return this.inherited(arguments);
        },

        query: function (query, options) {
            // sort by order field
            options = options || {};
            options.sort = [{attribute: this.ordinal}];
            return this.inherited(arguments);
        },

        // function used to support ordered insertion of store items
        calculateOrder: function (object, before, ordinal) {
            // Calculates proper value of order for an item to be placed before another
            var afterOrder, beforeOrder = 0;
            if (before) {
                // calculate midpoint between two items' orders to fit this one
                afterOrder = before[ordinal];
                this.query({}, {}).forEach(function(object) {
                    var ord = object[ordinal];
                    if(ord > beforeOrder && ord < afterOrder) {
                        beforeOrder = ord;
                    }
                });
                return (afterOrder + beforeOrder) / 2;
            } else {
                // find maximum order and place this one after it
                afterOrder = 0;
                this.query({}, {}).forEach(function(object) {
                    var ord = object[ordinal];
                    if(ord > afterOrder){ afterOrder = ord; }
                });
                return afterOrder + 1;
            }
        }
    });
});
