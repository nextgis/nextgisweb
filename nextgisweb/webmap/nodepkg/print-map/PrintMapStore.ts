import { makeAutoObservable, runInAction } from "mobx";

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
    legendCoords: LegendRndCoords = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        displayed: false,
        legendColumns: 0,
    };

    titleCoords: RndCoords = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        displayed: false,
    };

    mapCoords: RndCoords = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        displayed: false,
    };

    printMapPaper?: PrintMapPaper;

    webMapItems: TreeWebmapItem[] = [];

    constructor() {
        makeAutoObservable(this);
    }

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

    makeLayout(settings: PrintMapSettings) {
        const _makeLayout = () => {
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
                const legend_height = Math.ceil(heightPx / 4) + DEFAULT_MARGIN;
                this.legendCoords = {
                    x: 0,
                    y: heightPx - legend_height,
                    height: legend_height,
                    width: widthPx,
                    displayed: true,
                    legendColumns,
                };
            } else {
                const legend_width = Math.ceil(widthPx / 4) + DEFAULT_MARGIN;
                this.legendCoords = {
                    x: widthPx - legend_width,
                    y: title ? this.titleCoords.height + DEFAULT_MARGIN : 0,
                    height: title
                        ? heightPx - this.titleCoords.height - DEFAULT_MARGIN
                        : heightPx,
                    width: legend_width,
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
                heightMap =
                    heightPx - (this.titleCoords.height + DEFAULT_MARGIN);
            }
            if (legend && isPortrait) {
                heightMap =
                    heightMap - (this.legendCoords.height + DEFAULT_MARGIN);
            }

            this.mapCoords = {
                x: 0,
                y: title ? this.titleCoords.height + DEFAULT_MARGIN : 0,
                width: widthMap,
                height: heightMap,
                displayed: true,
            };
        };

        runInAction(_makeLayout);
    }

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

    updateColumnsCount(legendColumns: number) {
        this.legendCoords = { ...this.legendCoords, legendColumns };
    }
}

export const printMapStore = new PrintMapStore();
