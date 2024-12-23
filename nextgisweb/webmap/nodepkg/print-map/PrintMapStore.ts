import { action, observable } from "mobx";

import type { TreeWebmapItem } from "../layers-tree/LayersTree";

import type {
    LegendRndCoords,
    PrintMapPaper,
    PrintMapSettings,
    RndCoords,
} from "./type";
import { mmToPx } from "./utils";

const DEFAULT_MARGIN = 10;

class PrintMapStore {
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

    @observable.shallow accessor printMapPaper: PrintMapPaper | null = null;

    @observable.shallow accessor webMapItems: TreeWebmapItem[] = [];

    @action
    setWebMapItems(webMapItems: TreeWebmapItem[]) {
        this.webMapItems = webMapItems;
    }

    @action
    updatePrintMapPaper(paper: PrintMapPaper): boolean {
        if (!this.printMapPaper) {
            this.printMapPaper = paper;
            return true;
        }

        const shouldUpdate =
            paper.height !== this.printMapPaper.height ||
            paper.width !== this.printMapPaper.width ||
            paper.margin !== this.printMapPaper.margin;

        if (shouldUpdate) {
            this.printMapPaper = paper;
        }

        return shouldUpdate;
    }

    @action
    makeLayout(settings: PrintMapSettings) {
        const { width, height, margin, legend, legendColumns, title } =
            settings;

        const marginVerified = margin ?? 0;

        const widthPx = Math.round(mmToPx(width - marginVerified * 2));
        const heightPx = Math.round(mmToPx(height - marginVerified * 2));

        const isPortrait = widthPx < heightPx;

        this.titleCoords = {
            x: 0,
            y: 0,
            width: title ? widthPx : 0,
            height: title ? 42 : 0,
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
            const legendHeight = Math.ceil(heightPx / 4) + DEFAULT_MARGIN;
            this.legendCoords = {
                x: 0,
                y: heightPx - legendHeight,
                height: legendHeight,
                width: widthPx,
                displayed: true,
                legendColumns,
            };
        } else {
            const legendWidth = Math.ceil(widthPx / 4) + DEFAULT_MARGIN;
            this.legendCoords = {
                x: widthPx - legendWidth,
                y: title ? this.titleCoords.height + DEFAULT_MARGIN : 0,
                height: title
                    ? heightPx - this.titleCoords.height - DEFAULT_MARGIN
                    : heightPx,
                width: legendWidth,
                displayed: true,
                legendColumns,
            };
        }

        let widthMap = widthPx;
        if (legend && !isPortrait) {
            widthMap = widthPx - this.legendCoords.width - DEFAULT_MARGIN;
        }

        let heightMap = heightPx;
        if (title) {
            heightMap = heightPx - (this.titleCoords.height + DEFAULT_MARGIN);
        }
        if (legend && isPortrait) {
            heightMap = heightMap - (this.legendCoords.height + DEFAULT_MARGIN);
        }

        this.mapCoords = {
            x: 0,
            y: title ? this.titleCoords.height + DEFAULT_MARGIN : 0,
            width: widthMap,
            height: heightMap,
            displayed: true,
        };
    }

    @action
    updateCoordinates(
        type: "legendCoords" | "titleCoords" | "mapCoords",
        coords: RndCoords | LegendRndCoords,
        settings: PrintMapSettings
    ) {
        const shouldResetDefault = coords.displayed !== this[type].displayed;

        if (type === "legendCoords") {
            this.legendCoords = coords as LegendRndCoords;
        } else {
            this[type] = coords;
        }

        if (shouldResetDefault) {
            this.makeLayout(settings);
        }
    }

    @action
    updateColumnsCount(legendColumns: number) {
        this.legendCoords = { ...this.legendCoords, legendColumns };
    }
}

export const printMapStore = new PrintMapStore();
