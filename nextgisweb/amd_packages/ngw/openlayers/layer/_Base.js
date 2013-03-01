define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Stateful"
], function (
    declare,
    lang,
    Stateful
) {
    // Это очень печально, что все конструкторы слоев OL имеют разные сигнатуры,
    // поэтому какой-то универсальный класс обертку довольно трудно сделать.

    return declare([Stateful], {
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
            this.olLayer = new cls(this.olArgs[0], this.olArgs[1], this.olArgs[2]);

            var layer = this;

            this._visibility = this.olLayer.getVisibility();
            this.olLayer.events.on({
                visibilitychanged: function () {
                    if (layer.get("visibility") != layer.olLayer.getVisibility()) {
                        layer.set("visibility", layer.olLayer.getVisibility())
                    };
                }
            });
        },

        postscript: function () {
            // НЕ вызываем Stateful.postscript!
        },

        _visibilityGetter: function () {
            return this._visibility;
        },

        _visibilitySetter: function (value) {
            if (this._visibility != value) {
                this.olLayer.setVisibility(value);
                this._visibility = value;
            };
        }

    });
});