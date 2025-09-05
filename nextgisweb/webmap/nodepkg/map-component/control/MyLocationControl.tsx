import { observer } from "mobx-react-lite";
import Feature from "ol/Feature";
import Geolocation from "ol/Geolocation";
import { unByKey } from "ol/Observable";
import { Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { useCallback, useMemo, useRef, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { useMapContext } from "../context/useMapContext";

import type { ControlProps } from "./MapControl";
import { ToggleControl } from "./ToggleControl";

import LocationIcon from "@nextgisweb/icon/material/my_location";
import "./MyLocationControl.less";

const zIndexLocationLayer = 6000;

const positionFeatureStyle = new Style({
    image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "#076dbf" }),
        stroke: new Stroke({ color: "#fff", width: 1 }),
    }),
});

export interface MyLocationControlOptions {
    tipLabel?: string;
    zIndex?: number;
}

export type MyLocationControlProps = ControlProps<MyLocationControlOptions>;

export const MyLocationControl = observer(
    ({
        order,
        position,
        tipLabel = gettext("Show my location"),
        zIndex = zIndexLocationLayer,
    }: MyLocationControlProps) => {
        const { mapStore } = useMapContext();
        const [enabled, setEnabled] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const geolocationRef = useRef<Geolocation | null>(null);
        const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
        const posFeatureRef = useRef<Feature | null>(null);
        const accFeatureRef = useRef<Feature | null>(null);
        const shouldZoomRef = useRef<boolean>(false);
        const listenersRef = useRef<any[]>([]);

        const supported = useMemo(() => {
            return (
                typeof navigator !== "undefined" &&
                "geolocation" in navigator &&
                typeof location !== "undefined" &&
                location.protocol === "https:"
            );
        }, []);

        const teardown = useCallback(() => {
            if (geolocationRef.current) {
                geolocationRef.current.setTracking(false);
                listenersRef.current.forEach(unByKey);
            }
            listenersRef.current = [];
            geolocationRef.current = null;

            if (layerRef.current) {
                layerRef.current.setMap(null);
            }
            layerRef.current = null;
            posFeatureRef.current = null;
            accFeatureRef.current = null;
            shouldZoomRef.current = false;
        }, []);

        const buildLayer = useCallback(() => {
            posFeatureRef.current = new Feature();
            posFeatureRef.current.setStyle(positionFeatureStyle);
            accFeatureRef.current = new Feature();

            const source = new VectorSource({
                features: [accFeatureRef.current, posFeatureRef.current],
            });

            const layer = new VectorLayer({ source });
            layer.setMap(mapStore.olMap);
            layer.setZIndex(zIndex);
            layerRef.current = layer;
        }, [mapStore, zIndex]);

        const onAccuracyChange = useCallback(() => {
            const geo = geolocationRef.current;
            const acc = accFeatureRef.current;
            if (!geo || !acc) return;
            acc.setGeometry(geo.getAccuracyGeometry() || undefined);
        }, []);

        const onPositionChange = useCallback(() => {
            const geo = geolocationRef.current;
            const pos = posFeatureRef.current;
            if (!geo || !pos) return;
            const coords = geo.getPosition();
            pos.setGeometry(coords ? new Point(coords) : undefined);

            if (coords && shouldZoomRef.current) {
                shouldZoomRef.current = false;

                const extent = pos.getGeometry()!.getExtent();
                mapStore.zoomToExtent(extent);
            }
        }, [mapStore]);

        const onError = useCallback(() => {
            teardown();
            setEnabled(false);
            setError(gettext("Your location could not be determined"));
        }, [teardown]);

        const enable = useCallback(() => {
            setError(null);
            shouldZoomRef.current = true;
            buildLayer();

            const view = mapStore.olMap.getView();
            const geoloc = new Geolocation({
                trackingOptions: { enableHighAccuracy: true },
                projection: view.getProjection(),
                tracking: true,
            });
            geolocationRef.current = geoloc;

            listenersRef.current = [
                geoloc.on("change:accuracyGeometry", onAccuracyChange),
                geoloc.on("change:position", onPositionChange),
                geoloc.on("error", onError),
            ];

            setEnabled(true);
        }, [buildLayer, mapStore, onAccuracyChange, onPositionChange, onError]);

        const disable = useCallback(() => {
            teardown();
            setEnabled(false);
        }, [teardown]);

        const onClick = useCallback(() => {
            if (!supported) return;
            if (enabled) {
                disable();
            } else {
                enable();
            }
        }, [supported, enabled, enable, disable]);

        if (!supported) return null;

        const title = error ? error : tipLabel;

        return (
            <ToggleControl
                position={position}
                order={order}
                onClick={onClick}
                title={title}
            >
                <LocationIcon />
            </ToggleControl>
        );
    }
);

MyLocationControl.displayName = "MyLocationControl";

export default MyLocationControl;
