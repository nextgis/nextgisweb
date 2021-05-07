define([
    'openlayers/ol'
], function (ol) {
    function getCenter(extent) {
        return [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
    }

    function onBoxEnd() {
        var map = this.getMap(),
            view = map.getView(),
            size = map.getSize(),
            extent, resolution, center;

        extent = this.getGeometry().getExtent();
        resolution = view.getResolutionForExtent(extent, size);
        center = getCenter(extent);

        view.animate({
            resolution: resolution,
            center: center,
            duration: this.duration_,
            easing: ol.easing.easeOut
        });
    }

    var DragZoomUnConstrained = (function (DragBox) {
        function DragZoomUnConstrained() {
            DragBox.call(this, {
                condition: ol.events.condition.shiftKeyOnly,
                className: 'ol-dragzoom',
                onBoxEnd: onBoxEnd
            });
        }

        if (DragBox) DragZoomUnConstrained.__proto__ = DragBox;
        DragZoomUnConstrained.prototype = Object.create(DragBox && DragBox.prototype);
        DragZoomUnConstrained.prototype.constructor = DragZoomUnConstrained;

        return DragZoomUnConstrained;
    }(ol.interaction.DragBox));

    return DragZoomUnConstrained;
});
