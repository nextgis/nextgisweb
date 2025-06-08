import { useEffect, useRef } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";
import type { MapRefs } from "@nextgisweb/webmap/type";

import "./MapPane.less";

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

    const themeVariables = useThemeVariables({
        "theme-color-primary": "colorPrimary",
    });

    return (
        <div
            ref={mapRef}
            className="ngw-webmap-display-map-pane"
            style={themeVariables}
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
    );
}
