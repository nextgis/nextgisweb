/*  Copyright (c) 2015 Jean-Marc VIGLINO, 
    released under the CeCILL-B license (French BSD license)
    (http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
define([
    "dojo/_base/declare",
    "dojo/on",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dnd/Moveable",
    "dojo/dnd/Mover",
    "openlayers/ol",
    "xstyle/css!./Swipe.css",
], function (
    declare,
    on,
    lang,
    array,
    domClass,
    domStyle,
    domConstruct,
    domGeometry,
    Moveable,
    Mover,
    ol
) {
    var Swipe = function (opt_options) {
        var options = opt_options || {};

        var element = domConstruct.create("div");
        domClass.add(element, options.className || "ol-swipe");
        domClass.add(element, "ol-unselectable ol-control");
        domConstruct.create("button", null, element);

        this.layers = [];
        this.addLayers(options.layers || []);

        ol.control.Control.call(this, {
            element: element,
        });

        this.on(
            "propertychange",
            lang.hitch(this, function () {
                var orientation = this.get("orientation");
                var position = this.get("position");

                if (this.getMap()) {
                    this.getMap().render();
                }

                if (orientation === "vertical") {
                    domStyle.set(this.element, "left", position * 100 + "%");
                    domStyle.set(this.element, "top", "");
                } else {
                    domStyle.set(this.element, "top", position * 100 + "%");
                    domStyle.set(this.element, "left", "");
                }
                domClass.remove(this.element, "vertical horizontal");
                domClass.add(this.element, this.get("orientation"));
            })
        );

        this.set("position", options.position || 0.5);
        this.set("orientation", options.orientation || "vertical");

        new Moveable(element, {
            mover: declare([Mover], {
                onMouseMove: lang.hitch(this, function (e) {
                    var position;
                    var pageX = e.pageX;
                    var pageY = e.pageY;
                    var mapPosition = domGeometry.position(
                        this.getMap().getTargetElement()
                    );

                    if (this.get("orientation") === "vertical") {
                        pageX -= mapPosition.x;
                        position = this.getMap().getSize()[0];
                        position = Math.min(Math.max(0, pageX / position), 1);
                    } else {
                        pageY -= mapPosition.y;
                        position = this.getMap().getSize()[1];
                        position = Math.min(Math.max(0, pageY / position), 1);
                    }

                    this.set("position", position);
                }),
            }),
        });
        this._precompose = lang.hitch(this, this.precompose);
        this._postcompose = lang.hitch(this, this.postcompose);
    };
    Swipe.prototype = Object.create(ol.control.Control.prototype);
    Swipe.prototype.constructor = Swipe;

    Swipe.prototype.setMap = function (map) {
        if (this.getMap()) {
            array.forEach(
                this.layers,
                function (layer) {
                    layer.un("prerender", this._precompose);
                    layer.un("postrender", this._postcompose);
                },
                this
            );
            this.getMap().render();
        }

        ol.control.Control.prototype.setMap.call(this, map);

        if (map) {
            array.forEach(
                this.layers,
                function (layer) {
                    layer.on("prerender", this._precompose);
                    layer.on("postrender", this._postcompose);
                },
                this
            );
            map.render();
        }
    };

    Swipe.prototype.addLayers = function (layers) {
        array.forEach(
            layers,
            function (layer) {
                if (this.layers.indexOf(layer) === -1) {
                    this.layers.push(layer);
                    if (this.getMap()) {
                        layer.on("prerender", this._precompose);
                        layer.on("postrender", this._postcompose);
                        this.getMap().render();
                    }
                }
            },
            this
        );
    };

    Swipe.prototype.removeLayers = function (layers) {
        array.forEach(
            layers,
            function (layer, idx) {
                if (this.layers.indexOf(layer) !== -1) {
                    if (this.getMap()) {
                        layer.un("prerender", this._precompose);
                        layer.un("postrender", this._postcompose);
                        this.layers.splice(idx, 1);
                        this.getMap().render();
                    }
                }
            },
            this
        );
    };

    Swipe.prototype.precompose = function (event) {
        var ctx = event.context;
        var canvas = ctx.canvas;
        var position = this.get("position");
        var vertical = this.get("orientation") === "vertical";

        var w = vertical ? canvas.width * position : canvas.width;
        var h = vertical ? canvas.height : canvas.height * position;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();
    };

    Swipe.prototype.postcompose = function (e) {
        // restore context when decluttering is done
        // https://github.com/openlayers/openlayers/issues/10096
        if (
            e.target.getClassName() !== "ol-layer" &&
            e.target.get("declutter")
        ) {
            setTimeout(function () {
                e.context.restore();
            }, 0);
        } else {
            e.context.restore();
        }
    };

    return Swipe;
});
