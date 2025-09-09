import classNames from "classnames";
import type { MapEvent } from "ol";
import type { ViewStateLayerStateExtent } from "ol/View";
import { equals } from "ol/array";
import { toPromise } from "ol/functions";
import { useCallback, useEffect,  useState } from "react";
import type React from "react";

import { Modal } from "@nextgisweb/gui/antd";

import { useMapContext } from "../context/useMapContext";

import { MapControl } from "./MapControl";
import type { MapControlProps } from "./MapControl";

import InfoIcon from "@nextgisweb/icon/material/info";

export interface AttributionControlProps extends MapControlProps {
    className?: string;
    tipLabel?: string;
    label?: React.ReactNode;
    expandClassName?: string;
    attributions?: string | string[];
    smallBreakpointPx?: number;
}

function AttributionList({ items }: { items: string[] }) {
    return (
        <ul>
            {items.map((html, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: html }} />
            ))}
        </ul>
    );
}

export default function AttributionControl({
    className = "ol-attribution",
    tipLabel = "Attributions",
    label = <InfoIcon />,
    expandClassName,
    attributions,
    smallBreakpointPx = 640,
    ...mapControlProps
}: AttributionControlProps) {
    const { mapStore } = useMapContext();
    const [modal, contextHolder] = Modal.useModal();

    const [visible, setVisible] = useState(true);
    const [items, setItems] = useState<string[]>([]);
    const [isSmall, setIsSmall] = useState<boolean | null>(null);

    const expandCls = expandClassName ?? `${className}-expand`;

    useEffect(() => {
        const map = mapStore.olMap;
        if (!map || !mapStore.targetElement) return;

        const container = mapStore.targetElement;

        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect?.width ?? container!.clientWidth;
            setIsSmall(w <= smallBreakpointPx);
        });
        ro.observe(container);

        setIsSmall((container.clientWidth || 0) <= smallBreakpointPx);

        return () => {
            ro.disconnect();
        };
    }, [mapStore, mapStore.targetElement, smallBreakpointPx]);

    const collectSourceAttributions = useCallback(
        (frameState: ViewStateLayerStateExtent) => {
            const layers = mapStore.olMap.getAllLayers();

            const visibleAttributions = new Set(
                layers.flatMap((layer) => layer.getAttributions(frameState))
            );

            if (attributions !== undefined) {
                if (Array.isArray(attributions)) {
                    attributions.forEach((item) =>
                        visibleAttributions.add(item)
                    );
                } else {
                    visibleAttributions.add(attributions);
                }
            }
            return Array.from(visibleAttributions);
        },
        [attributions, mapStore.olMap]
    );

    const update = useCallback(
        async (frameState: ViewStateLayerStateExtent | null) => {
            if (!frameState) {
                setVisible(false);
                return;
            }

            const attributions = await Promise.all(
                Array.from(collectSourceAttributions(frameState)).map(
                    (attribution) => toPromise(() => attribution)
                )
            );

            setVisible(attributions.length > 0);

            setItems((prev) => {
                if (equals(attributions, prev)) {
                    return prev;
                }
                return attributions;
            });
        },
        [collectSourceAttributions]
    );

    useEffect(() => {
        const map = mapStore.olMap;
        if (!map) return;
        const handler = (e: MapEvent) =>
            update(e?.frameState as ViewStateLayerStateExtent | null);
        map.on("postrender", handler);
        return () => {
            map.un("postrender", handler);
        };
    }, [mapStore, update]);

    const onClickInfo = useCallback(() => {
        if (!isSmall) return;
        modal.info({
            type: "info",
            content: (
                <div className="ol-attribution-modal">
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                        {tipLabel}
                    </div>
                    <AttributionList items={items} />
                </div>
            ),
        });
    }, [isSmall, modal, tipLabel, items]);

    return (
        <MapControl {...mapControlProps}>
            {contextHolder}
            <div
                className={classNames(
                    className,
                    "ol-unselectable",
                    "ol-control",
                    { "ol-uncollapsible": !isSmall }
                )}
                style={{ display: visible ? "" : "none" }}
            >
                {isSmall ? (
                    <div
                        className={expandCls}
                        aria-label={tipLabel}
                        title={tipLabel}
                        onClick={onClickInfo}
                    >
                        {label}
                    </div>
                ) : (
                    <AttributionList items={items} />
                )}
            </div>
        </MapControl>
    );
}
