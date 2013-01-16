define([
    "dojo/_base/declare",
    "dojo/_base/lang"
], function (
    declare,
    lang
) {
    // Это очень печально, что все конструкторы слоев OL имеют разные сигнатуры,
    // поэтому какой-то универсальный класс обертку довольно трудно сделать.

    return declare(null, {
        "-chains-": {
            constructor: "manual"
        },

        olClassName: "OpenLayers.Layer",
        olArgs: [],

        constructor: function (name, options) {
            this.name = name;
            this.title = options.title;
            this.isBaseLayer = !!options.isBaseLayer;

            var cls = lang.getObject(this.olClassName, true);
            this.olLayer = new cls(name, this.olArgs[0], this.olArgs[1], this.olArgs[2]);
        }
    });
});