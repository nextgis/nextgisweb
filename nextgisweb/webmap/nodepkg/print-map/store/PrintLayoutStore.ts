import { action, observable } from "mobx";

import type { LegendRndCoords, PrintMapSettings, RndCoords } from "../type";
import { mmToPx } from "../utils";

export class PrintLayoutStore {
    defaultMargin = 10;

    @observable.shallow accessor legendCoords: LegendRndCoords = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        displayed: false,
        legendColumns: 0,
    };

    @observable.shallow accessor titleCoords: RndCoords = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        displayed: false,
    };

    @observable.shallow accessor mapCoords: RndCoords = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        displayed: false,
    };

    @action
    updateCoordinates(
        type: "legendCoords" | "titleCoords" | "mapCoords",
        coords: RndCoords | LegendRndCoords
    ) {
        if (type === "legendCoords") {
            this.legendCoords = coords as LegendRndCoords;
        } else {
            this[type] = coords;
        }
    }

    @action
    updateColumnsCount(legendColumns: number) {
        this.legendCoords = { ...this.legendCoords, legendColumns };
    }

    @action
    makeLayout({
        width,
        title,
        height,
        margin = 0,
        legend,
        legendColumns,
    }: Pick<
        PrintMapSettings,
        "width" | "height" | "margin" | "legend" | "legendColumns" | "title"
    >) {
        const defMargin = this.defaultMargin;

        const widthPx = Math.round(mmToPx(width - margin * 2));
        const heightPx = Math.round(mmToPx(height - margin * 2));
        const isPortrait = widthPx < heightPx;

        const titleHeight = title ? 42 : 0;
        this.titleCoords = {
            x: 0,
            y: 0,
            width: title ? widthPx : 0,
            height: titleHeight,
            displayed: !!title,
        };

        if (!legend) {
            this.legendCoords = {
                x: 0,
                y: 0,
                height: 0,
                width: 0,
                displayed: false,
                legendColumns,
            };
        } else if (isPortrait) {
            const legendHeight = Math.ceil(heightPx / 4) + defMargin;
            this.legendCoords = {
                x: 0,
                y: heightPx - legendHeight,
                height: legendHeight,
                width: widthPx,
                displayed: true,
                legendColumns,
            };
        } else {
            const legendWidth = Math.ceil(widthPx / 4) + defMargin;
            this.legendCoords = {
                x: widthPx - legendWidth,
                y: title ? titleHeight + defMargin : 0,
                height: title ? heightPx - titleHeight - defMargin : heightPx,
                width: legendWidth,
                displayed: true,
                legendColumns,
            };
        }

        let widthMap = widthPx;
        if (legend && !isPortrait) {
            widthMap = widthPx - this.legendCoords.width - defMargin;
        }

        let heightMap = heightPx;
        if (title) {
            heightMap = heightPx - (this.titleCoords.height + defMargin);
        }
        if (legend && isPortrait) {
            heightMap = heightMap - (this.legendCoords.height + defMargin);
        }

        this.mapCoords = {
            x: 0,
            y: title ? titleHeight + defMargin : 0,
            width: widthMap,
            height: heightMap,
            displayed: true,
        };
    }
}
