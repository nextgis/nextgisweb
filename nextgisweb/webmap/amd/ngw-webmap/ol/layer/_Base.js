define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Stateful",
    "openlayers/ol"
], function (
    declare,
    lang,
    Stateful,
    ol
) {
    return declare([Stateful], {
        "-chains-": {
            constructor: "manual"
        },

        olLayerClassName: "layer.Layer",
        olSourceClassName: "source.Source",

        constructor: function (name, loptions, soptions) {
            this.name = name;
            this.title = loptions.title;

            var lcls = lang.getObject(this.olLayerClassName, true, ol);
            this.olLayer = new lcls(loptions);

            var scls = lang.getObject(this.olSourceClassName, true, ol);
            this.olSource = new scls(soptions);

            this.olLayer.setSource(this.olSource);

            var layer = this;

            this._visibility = this.olLayer.getVisible();
            this.olLayer.on("change:visible", function () {
                if (layer.get("visibility") != layer.olLayer.getVisible()) {
                    layer.set("visibility", layer.olLayer.getVisible());
                }
            });
        },

        reload: function () {
            this.olSource.changed();
        },

        postscript: function () {
            // Don't call Stateful.postscript!
        },

        _visibilityGetter: function () {
            return this._visibility;
        },

        _visibilitySetter: function (value) {
            if (this._visibility != value) {
                this.olLayer.setVisible(value);
                this._visibility = value;
            }
        }

    });
});
