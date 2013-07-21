/*global define, require*/
define([
    "dojo/_base/declare",
    "./Base",
    "dojo/number",
    "dijit/popup",
    "dijit/TooltipDialog",
    "ngw/openlayers"
], function (
    declare,
    Base,
    number,
    popup,
    TooltipDialog,
    openlayers
) {
    return declare(Base, {
        constructor: function (options) {
            if (this.order == 1) {
                this.label = "Измерение расстояния";
                this.iconClass = "iconRuler";
            } else if (this.order == 2) {
                this.label = "Измерение площади";
                this.iconClass = "iconRulerSquare";
            };

            var sketchSymbolizers = {
                Point: {pointRadius: 0},
                Line: {strokeWidth: 2, strokeColor: "#d00"},
                Polygon: {strokeWidth: 2, strokeColor: "#d00", fillColor: "#d00", fillOpacity: 0.25}
            };

            var style = new openlayers.Style();
            style.addRules([new openlayers.Rule({symbolizer: sketchSymbolizers})]);

            this.control = new openlayers.Control.Measure(
                this.order == 2 ? OpenLayers.Handler.Polygon : OpenLayers.Handler.Path,
                {
                    persist: true,
                    geodesic: true,
                    order: this.order,
                    handlerOptions: {
                        layerOptions: {
                            renderers: openlayers.Layer.Vector.prototype.renderers,
                            styleMap: new OpenLayers.StyleMap({"default": style})
                        }
                    }
                }
            );

            this.display.map.olMap.addControl(this.control);

            // Тултип для вывода результатов
            this.tooltip = new TooltipDialog();

            var widget = this;
            this.control.events.on({
                measurepartial: function (event) {
                    widget.tooltip.set(
                        "content",
                        (event.order == 1 ? "L = " : "S = ")
                        + number.format(event.measure) + " "
                        + event.units + (event.order == 2 ? "<sup>2</sup>" : "")
                    );
                }
            });

            this.active = false;
        },

        activate: function () {
            if (this.active) { return };
            this.active = true;

            this.control.activate();

            // Подсказка пользователю
            this.tooltip.set(
                "content",
                "Одинарный щелчёк добавляет точку для измерения,<br/>"
                + "Двойной щелчёк завершает измерение."
            );
            
            popup.open({
                popup: this.tooltip,
                around: this.toolbarBtn.domNode
            });
        },

        deactivate: function () {
            if (!this.active) { return };
            this.active = false;

            this.control.deactivate();
            popup.close(this.tooltip);
        }

    });
});
