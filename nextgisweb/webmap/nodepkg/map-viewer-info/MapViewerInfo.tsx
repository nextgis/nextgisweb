import type { Map } from "ol";
import { unByKey } from "ol/Observable";
import type { EventsKey } from "ol/events";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { useDebounce } from "@nextgisweb/pyramid/hook";
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

export interface MapViewerInfoProps {
    map: Map;
}

export function MapViewerInfo({ map }: MapViewerInfoProps) {
    const [type, setType] = useState<"mouse" | "extent">("mouse");
    const [coord, setCoord] = useState<number[] | undefined>(
        map.getView().getCenter()
    );
    const [extent, setExtent] = useState<number[]>();

    const handleMouseMove = useDebounce((evt: any) => {
        setCoord(evt.coordinate);
    }, 50);

    const handleExtentChange = useDebounce(() => {
        setExtent(map.getView().calculateExtent(map.getSize()));
    }, 300);

    const { transformedCoord, transformedExtent, roundDecPlaces } =
        useProjections(coord, extent, type);

    const changeType = useCallback(() => {
        setType((prevType) => (prevType === "mouse" ? "extent" : "mouse"));
    }, []);

    useEffect(() => {
        let callbackKey: EventsKey | undefined;

        const clearCallback = () => {
            if (callbackKey) {
                unByKey(callbackKey);
            }
            handleMouseMove.cancel();
            handleExtentChange.cancel();
        };

        const bindEvents = () => {
            if (type === "mouse") {
                callbackKey = map.on("pointermove", handleMouseMove);
            } else {
                setExtent(map.getView().calculateExtent(map.getSize()));
                callbackKey = map.getView().on("change", handleExtentChange);
            }
        };

        bindEvents();
        return clearCallback;
    }, [type, map]);

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

    const DisplayPosition = () => {
        if (type === "mouse") {
            return transformedCoord ? (
                <CoordsDisplay
                    coord={transformedCoord}
                    round={roundDecPlaces}
                />
            ) : (
                <></>
            );
        } else {
            if (!transformedExtent) {
                return <></>;
            }
            const [x1, y1, x2, y2] = transformedExtent;
            return (
                <>
                    <CoordsDisplay coord={[x1, y1]} round={roundDecPlaces} />
                    <span> : </span>
                    <CoordsDisplay coord={[x2, y2]} round={roundDecPlaces} />
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
