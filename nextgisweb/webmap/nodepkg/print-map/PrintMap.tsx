import debounce from "lodash-es/debounce";
import Map from "ol/Map";
import type OlMap from "ol/Map";
import View from "ol/View";
import { Rotate } from "ol/control";
import type { Coordinate } from "ol/coordinate";
import { defaults as defaultInteractions } from "ol/interaction";
import { useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { LayersTree } from "../layers-tree/LayersTree";
import type { TreeWebmapItem } from "../layers-tree/LayersTree";
import { getLabel } from "../map-controls/map-controls";
import MapScaleControl from "../ol/ol-ext/ol-mapscale";
import type WebmapStore from "../store";
import type { DojoDisplay } from "../type";
import type { LayerItem } from "../type/TreeItems";

import { printMapStore } from "./PrintMapStore";
import type { RndCoords } from "./PrintMapStore";
import { buildPrintStyle } from "./PrintMapStyle";

import "./PrintMap.less";

const setMapScale = (scale: number, olMap: OlMap): void => {
    const view = olMap.getView();
    const center = view.getCenter();
    if (!center) {
        return;
    }
    const cosh = (value: number) => {
        return (Math.exp(value) + Math.exp(-value)) / 2;
    };
    const pointResolution3857 = cosh(center[1] / 6378137);
    const resolution = pointResolution3857 * (scale / (96 * 39.3701));
    olMap.getView().setResolution(resolution);
};

const switchRotateControl = (olMap: OlMap, show: boolean): void => {
    const controls = olMap.getControls();
    const rotateControl = controls
        .getArray()
        .find((control) => control instanceof Rotate);

    if (!rotateControl && show) {
        const rotateControl = new Rotate({
            tipLabel: gettext("Reset rotation"),
            label: getLabel("arrow_upward"),
            autoHide: false,
        });
        olMap.addControl(rotateControl);
    }

    if (rotateControl && !show) {
        olMap.removeControl(rotateControl);
    }
};

const buildMap = (container: HTMLElement, display: DojoDisplay): OlMap => {
    const interactions = defaultInteractions({
        doubleClickZoom: true,
        keyboard: true,
        mouseWheelZoom: true,
        shiftDragZoom: false,
    });

    const view = new View({
        center: display.map.olMap.getView().getCenter(),
        zoom: display.map.olMap.getView().getZoom(),
    });

    const printMap: OlMap = new Map({
        target: container,
        controls: [],
        interactions,
        view,
    });

    display.map.olMap
        .getLayers()
        .getArray()
        .forEach((layer) => {
            if (layer.getVisible() && (layer as any).printingCopy) {
                // Adding the same layer to different maps causes
                // infinite loading, thus we need a copy.
                printMap.addLayer((layer as any).printingCopy());
            }
        });

    display.map.olMap
        .getOverlays()
        .getArray()
        .forEach((overlay) => {
            if ("annPopup" in overlay && overlay.annPopup) {
                const annPopup = overlay.annPopup;
                const clonedPopup = (annPopup as any).cloneOlPopup(
                    (annPopup as any).getAnnFeature()
                );
                printMap.addOverlay(clonedPopup);
            }
        });

    const mapLogoEl = document.getElementsByClassName("map-logo");
    if (mapLogoEl.length > 0) {
        const olViewportEl = container.getElementsByClassName("ol-viewport")[0];
        const newLogoEl = mapLogoEl[0].cloneNode(true);
        olViewportEl.appendChild(newLogoEl);
    }

    return printMap;
};

export interface PrintMapSettings {
    width: number;
    height: number;
    margin: number;
    scaleLine: boolean;
    scaleValue: boolean;
    arrow: boolean;
    legend: boolean;
    center?: Coordinate | null;
    title?: boolean;
    scale?: number;
}

interface PrintMapProps {
    settings: PrintMapSettings;
    initCenter: Coordinate | null;
    display: DojoDisplay;
    onScaleChange: (scale: number) => void;
    onCenterChange: (center: Coordinate) => void;
}

class PrintMapStyle {
    style: HTMLStyleElement;

    constructor() {
        this.style = document.createElement("style");
        document.body.appendChild(this.style);
    }

    private mmToPx(mm: number): number {
        // According to https://www.w3.org/TR/css3-values/#absolute-lengths
        return (mm / 10) * (96 / 2.54);
    }

    update(settings: Pick<PrintMapSettings, "width" | "height" | "margin">) {
        const widthPage = Math.round(this.mmToPx(settings.width));
        const heightPage = Math.round(this.mmToPx(Number(settings.height)));
        const margin = Math.round(this.mmToPx(settings.margin));
        const widthMap = widthPage - margin * 2;
        const heightMap = heightPage - margin * 2;

        const newStyleText = buildPrintStyle({
            widthPage,
            heightPage,
            margin,
            widthMap,
            heightMap,
        });

        this.style.innerHTML = newStyleText;
    }

    clear(): void {
        if (!this.style) {
            return;
        }
        this.style.remove();
    }
}

const handleTreeItem = (checked: Set<number>, layersItem: TreeWebmapItem) => {
    const { key } = layersItem;

    if (layersItem.isLeaf) {
        if (!checked.has(key)) {
            return null;
        }

        const hasLegend =
            layersItem.legendIcon ||
            (layersItem.treeItem as LayerItem).legendInfo.open;

        if (hasLegend) {
            return layersItem;
        } else {
            return null;
        }
    }

    if (layersItem.children) {
        const newLayersItems: TreeWebmapItem[] = [];
        (layersItem.children as TreeWebmapItem[]).forEach((item) => {
            const newTreeItem = handleTreeItem(checked, item);
            if (newTreeItem) {
                newLayersItems.push(newTreeItem);
            }
        });
        layersItem.children = newLayersItems;
        return layersItem.children.length ? layersItem : null;
    }
};

const filterTreeItems = (store: WebmapStore, layersItems: TreeWebmapItem[]) => {
    const newLayersItems: TreeWebmapItem[] = [];
    const checked = new Set(store.getChecked());
    layersItems.forEach((item) => {
        const newTreeItem = handleTreeItem(checked, item);
        if (newTreeItem) {
            newLayersItems.push(newTreeItem);
        }
    });
    return newLayersItems;
};

interface RndCompProps {
    init: RndCoords;
    onChange: (coords: RndCoords) => void;
    className?: string;
    children: string | JSX.Element | JSX.Element[];
}

export const RndComp = ({
    init,
    onChange,
    className,
    children,
}: RndCompProps) => {
    return (
        <Rnd
            default={init}
            onResizeStop={(e, direction, ref, delta, position) => {
                onChange({
                    width: ref.offsetWidth,
                    height: ref.offsetHeight,
                    ...position,
                });
            }}
            onDragStop={(e, d) => {
                onChange({
                    width: printMapStore.legend.width,
                    height: printMapStore.legend.height,
                    x: d.x,
                    y: d.y,
                });
            }}
            className={className}
        >
            {children}
        </Rnd>
    );
};

export const PrintMap = ({
    settings,
    display,
    initCenter,
    onScaleChange,
    onCenterChange,
}: PrintMapProps) => {
    const {
        width,
        height,
        margin,
        scale,
        scaleLine,
        scaleValue,
        legend,
        title,
        arrow,
    } = settings;
    const printMapRef = useRef<HTMLDivElement>(null);
    const printMap = useRef<OlMap>();

    const [mapScaleControl, setMapScaleControl] = useState<MapScaleControl>();
    const [style, setStyle] = useState<PrintMapStyle>();

    useEffect(() => {
        const printMapStyle = new PrintMapStyle();
        printMapStyle.update({ width, height, margin });
        setStyle(printMapStyle);
        return () => {
            printMapStyle.clear();
        };
    }, [width, height, margin]);

    useEffect(() => {
        if (printMapRef.current) {
            const map = buildMap(printMapRef.current, display);

            if (initCenter) {
                const view = map.getView();
                view.setCenter(initCenter);
            }

            const fireChangeCenter = () => {
                if (!onCenterChange) {
                    return;
                }
                const centerPrintMap = map.getView().getCenter();
                if (centerPrintMap) {
                    onCenterChange(centerPrintMap);
                }
            };

            const viewCenterChange = debounce(() => {
                fireChangeCenter();
            }, 100);
            map.getView().on("change:center", viewCenterChange);
            fireChangeCenter();

            const onChangeScale = debounce((scale: string) => {
                onScaleChange(parseInt(scale, 10));
            }, 100);

            const mapScale = new MapScaleControl({
                formatNumber: (scale) => {
                    return String(Math.round(scale / 1000) * 1000);
                },
                onChangeScale,
            });
            map.addControl(mapScale);
            printMap.current = map;
            setMapScaleControl(mapScale);
        }
    }, [display]);

    useEffect(() => {
        if (printMap.current && style) {
            style.update({ width, height, margin });
            printMap.current.updateSize();
            if (scale !== undefined) {
                setMapScale(scale, printMap.current);
            }
        }
    }, [width, height, margin, scale, style]);

    useEffect(() => {
        if (printMap.current) {
            switchRotateControl(printMap.current, arrow);
        }
    }, [arrow]);

    useEffect(() => {
        const control = mapScaleControl;
        if (control) {
            control.setScaleLineVisibility(scaleLine);
            control.setScaleValueVisibility(scaleValue);
        }
    }, [scaleLine, scaleValue, mapScaleControl]);

    const legendComp = useMemo(() => {
        if (!legend) {
            return null;
        }

        return (
            <RndComp
                init={printMapStore.legend}
                onChange={(rndCoords) => {
                    printMapStore.legend = rndCoords;
                }}
                className="legend-rnd"
            >
                <div className="legend">
                    <LayersTree
                        {...{
                            store: display.webmapStore,
                            onSelect: () => {},
                            setLayerZIndex: () => {},
                            getWebmapPlugins: () => ({}),
                            onReady: () => {},
                            showDropdown: false,
                            draggable: false,
                            checkable: false,
                            onFilterItems: (store, layersItems) => {
                                return filterTreeItems(store, layersItems);
                            },
                        }}
                    />
                </div>
            </RndComp>
        );
    }, [legend]);

    const titleComp = useMemo(() => {
        if (!title) return null;
        return (
            <RndComp
                init={printMapStore.title}
                onChange={(rndCoords) => {
                    printMapStore.title = rndCoords;
                }}
                className="title-rnd"
            >
                <div className="title">{display.config.webmapTitle}</div>
            </RndComp>
        );
    }, [title]);

    if (printMap)
        return (
            <div className="print-map-page-wrapper">
                <div className="print-map-export-wrapper">
                    <div className="print-map-page">
                        <div className="print-map">
                            <div className="print-olmap" ref={printMapRef}>
                                {legendComp}
                                {titleComp}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
};
