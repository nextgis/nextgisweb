import { observer } from "mobx-react-lite";
import type { FitOptions } from "ol/View";
import type { Options as OlZoomControlOptions } from "ol/control/Zoom";
import { easeOut } from "ol/easing";
import type { Extent } from "ol/extent";
import type { ProjectionLike } from "ol/proj";
import { useCallback, useEffect, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { useMapContext } from "../context/useMapContext";

import { MapControl } from "./MapControl";
import type { ControlProps } from "./MapControl";

import ZoomInIcon from "@nextgisweb/icon/material/add";
import HomeIcon from "@nextgisweb/icon/material/home";
import ZoomOutIcon from "@nextgisweb/icon/material/remove";

import "./ZoomControl.less";

interface ShowZoomLevelOptions {
    displayDecimals?: boolean;
}

export interface ZoomControlOptions
    extends Pick<
        OlZoomControlOptions,
        | "delta"
        | "duration"
        | "className"
        | "zoomInTipLabel"
        | "zoomOutTipLabel"
    > {
    extent?: Extent;
    fitOptions?: FitOptions;
    showZoomLevel?: boolean | ShowZoomLevelOptions;
    extentProjection?: ProjectionLike;
}

export type ZoomControlProps = ControlProps<ZoomControlOptions>;

const ZoomLevel = observer(
    ({
        mapStore,
        displayDecimals,
    }: { mapStore: MapStore } & ShowZoomLevelOptions) => {
        // Do not use mapStore.zoom directly because it is updated only on 'moveend'.
        const [zoom, setZoom] = useState<number | null>(null);
        useEffect(() => {
            if (typeof mapStore.resolution === "number") {
                const { zoom } = mapStore.getPosition();
                setZoom(zoom);
            }
        }, [mapStore, mapStore.resolution]);

        if (zoom === null) return null;
        const rounded = parseFloat(zoom.toFixed(displayDecimals ? 1 : 0));
        const displayZoom = Number.isInteger(rounded)
            ? String(rounded.toFixed(0))
            : String(rounded);
        return (
            <span
                className="zoom-level-display"
                title={gettext("Current zoom level")}
            >
                {displayZoom}
            </span>
        );
    }
);

ZoomLevel.displayName = "ZoomLevel";

export const ZoomControl = observer(
    ({
        delta = 1,
        order,
        extent,
        position,
        duration = 250,
        className,
        fitOptions,
        showZoomLevel = false,
        zoomInTipLabel = gettext("Zoom in"),
        zoomOutTipLabel = gettext("Zoom out"),
        extentProjection = "EPSG:4326",
    }: ZoomControlProps) => {
        const { mapStore } = useMapContext();

        const [canZoomIn, setCanZoomIn] = useState(true);
        const [canZoomOut, setCanZoomOut] = useState(true);

        useEffect(() => {
            const view = mapStore.olMap.getView();
            const current = view.getZoom();
            if (typeof current !== "number") {
                setCanZoomIn(false);
                setCanZoomOut(false);
                return;
            }
            const nextInc = view.getConstrainedZoom(current + Math.abs(delta));
            const nextDec = view.getConstrainedZoom(current - Math.abs(delta));
            setCanZoomIn(typeof nextInc === "number" && nextInc > current);
            setCanZoomOut(typeof nextDec === "number" && nextDec < current);
        }, [mapStore, mapStore.resolution, delta]);

        const zoomBy = useCallback(
            (d: number) => {
                const view = mapStore.olMap.getView();
                const current = view.getZoom();
                if (typeof current !== "number") return;

                const newZoom = view.getConstrainedZoom(current + d);
                if (typeof newZoom === "number") {
                    if (duration > 0) {
                        if (view.getAnimating?.()) {
                            view.cancelAnimations?.();
                        }
                        view.animate({
                            zoom: newZoom,
                            duration,
                            easing: easeOut,
                        });
                    } else {
                        view.setZoom(newZoom);
                    }
                }
            },
            [mapStore, duration]
        );

        const zoomIn = useCallback(() => zoomBy(delta), [zoomBy, delta]);
        const zoomOut = useCallback(() => zoomBy(-delta), [zoomBy, delta]);

        const goHome = useCallback(() => {
            if (!extent) return;
            mapStore.zoomToExtent(extent, {
                ...fitOptions,
                projection: extentProjection,
            });
        }, [mapStore, extent, extentProjection, fitOptions]);

        return (
            <MapControl
                className={className}
                position={position}
                order={order}
                bar
                margin
            >
                <button
                    type="button"
                    disabled={!canZoomIn}
                    className="ol-zoom-in"
                    title={zoomInTipLabel}
                    onClick={zoomIn}
                >
                    <ZoomInIcon />
                </button>

                {showZoomLevel && (
                    <ZoomLevel
                        mapStore={mapStore}
                        {...(typeof showZoomLevel === "object"
                            ? showZoomLevel
                            : {})}
                    />
                )}

                <button
                    type="button"
                    disabled={!canZoomOut}
                    className="ol-zoom-out"
                    title={zoomOutTipLabel}
                    onClick={zoomOut}
                >
                    <ZoomOutIcon />
                </button>

                {extent && (
                    <button
                        type="button"
                        className="home-button"
                        title={gettext("Back to the initial extent")}
                        onClick={goHome}
                    >
                        <HomeIcon />
                    </button>
                )}
            </MapControl>
        );
    }
);

ZoomControl.displayName = "ZoomControl";

export default ZoomControl;
