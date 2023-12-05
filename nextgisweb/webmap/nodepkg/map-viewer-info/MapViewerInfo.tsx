import type { Map, MapBrowserEvent } from "ol";
import { unByKey } from "ol/Observable";
import type { EventsKey } from "ol/events";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { roundValue } from "../utils/format-units";

import { useProjections } from "./hook/useProjections";

import CropFreeIcon from "@nextgisweb/icon/material/crop_free";
import MouseIcon from "@nextgisweb/icon/material/mouse";
import "./MapViewerInfo.less";

interface CoordPairProps {
    coord?: number[];
    round?: number;
}

const CoordsDisplay = ({ coord, round = 0 }: CoordPairProps) => {
    if (!coord) {
        return null;
    }
    return <span>{coord.map((c) => roundValue(c, round)).join(" ")}</span>;
};

interface MapViewerInfoProps {
    map: Map;
    show: boolean;
}

export function MapViewerInfo({ map, show }: MapViewerInfoProps) {
    const [type, setType] = useState<"mouse" | "extent">("mouse");
    const [coord, setCoord] = useState<number[] | undefined>(
        map.getView().getCenter()
    );
    const [extent, setExtent] = useState<number[]>();
    const { transformCoords, transformMapExtent, roundDecPlaces } =
        useProjections(map);

    const changeType = useCallback(() => {
        setType((prevType) => (prevType === "mouse" ? "extent" : "mouse"));
    }, []);

    useEffect(() => {
        if (!show) {
            return;
        }

        let callbackKey: EventsKey | undefined;

        const clearCallback = () => {
            if (callbackKey) {
                unByKey(callbackKey);
            }
        };

        const updateExtent = () => {
            setExtent(map.getView().calculateExtent(map.getSize()));
        };

        const bindEvents = () => {
            if (type === "mouse") {
                callbackKey = map.on(
                    "pointermove",
                    (evt: MapBrowserEvent<UIEvent>) => setCoord(evt.coordinate)
                );
            } else {
                updateExtent();
                callbackKey = map.getView().on("change", updateExtent);
            }
        };

        bindEvents();
        return clearCallback;
    }, [type, show, map]);

    const icon = useMemo(
        () => (type === "mouse" ? <MouseIcon /> : <CropFreeIcon />),
        [type]
    );
    const title = useMemo(
        () =>
            type === "mouse"
                ? gettext("Show extent")
                : gettext("Show cursor coordinates"),
        [type]
    );

    if (!show) {
        return null;
    }

    const DisplayPosition = () => {
        if (type === "mouse") {
            return coord ? (
                <CoordsDisplay
                    coord={transformCoords(coord)}
                    round={roundDecPlaces}
                />
            ) : (
                <></>
            );
        } else {
            if (!extent) {
                return <></>;
            }
            const [e0, e1, e2, e3] = transformMapExtent(extent);
            return (
                <>
                    <CoordsDisplay coord={[e0, e1]} round={roundDecPlaces} />
                    <span>:</span>
                    <CoordsDisplay coord={[e2, e3]} round={roundDecPlaces} />
                </>
            );
        }
    };

    return (
        <div className="map-viewer-info">
            <div className={`coordinates type-${type} round-${roundDecPlaces}`}>
                <DisplayPosition />
            </div>
            <Button
                className="switch"
                type="primary"
                icon={icon}
                title={title}
                onClick={changeType}
            />
        </div>
    );
}
