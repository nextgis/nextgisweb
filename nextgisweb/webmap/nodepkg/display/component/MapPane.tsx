import { useEffect, useRef } from "react";

import type { MapRefs } from "@nextgisweb/webmap/type";

export function MapPane({
    setMapRefs,
}: {
    setMapRefs: (val: MapRefs) => void;
}) {
    const mapRef = useRef<HTMLDivElement>(null);
    const leftTopControlPaneRef = useRef<HTMLDivElement>(null);
    const leftBottomControlPaneRef = useRef<HTMLDivElement>(null);
    const rightTopControlPaneRef = useRef<HTMLDivElement>(null);
    const rightBottomControlPaneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (
            mapRef.current &&
            leftTopControlPaneRef.current &&
            leftBottomControlPaneRef.current &&
            rightTopControlPaneRef.current &&
            rightBottomControlPaneRef.current
        ) {
            setMapRefs({
                target: mapRef.current,
                leftTopControlPane: leftTopControlPaneRef.current,
                leftBottomControlPane: leftBottomControlPaneRef.current,
                rightTopControlPane: rightTopControlPaneRef.current,
                rightBottomControlPane: rightBottomControlPaneRef.current,
            });
        }
    }, [setMapRefs]);

    return (
        <div
            className="map-pane"
            style={{
                width: "100%",
                padding: 0,
            }}
        >
            <div
                className="map-node"
                ref={mapRef}
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    padding: 0,
                }}
            >
                <div
                    ref={leftTopControlPaneRef}
                    className="control-pane control-pane--top control-pane--left"
                />
                <div
                    ref={leftBottomControlPaneRef}
                    className="control-pane control-pane--bottom control-pane--left"
                />
                <div
                    ref={rightTopControlPaneRef}
                    className="control-pane control-pane--top control-pane--right"
                />
                <div
                    ref={rightBottomControlPaneRef}
                    className="control-pane control-pane--bottom control-pane--right"
                />
            </div>
        </div>
    );
}
