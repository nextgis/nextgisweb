import Feature from "ol/Feature";
import WKT from "ol/format/WKT";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import FeatureGrid from "@nextgisweb/feature-layer/feature-grid";
import type { FeatureGridProps } from "@nextgisweb/feature-layer/feature-grid";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import type { NgwExtent } from "@nextgisweb/feature-layer/type/FeatureExtent";
import { route } from "@nextgisweb/pyramid/api/route";
import { gettext } from "@nextgisweb/pyramid/i18n";
import ZoomToFilteredBtn from "@nextgisweb/webmap/zoom-to-filtered-btn";

import type {
    DisplayItemConfig,
    DojoTopic,
    FeatureLayerWebMapPluginConfig,
    TopicSubscription,
} from "../panels-manager/type";
import type { DojoDisplay } from "../type";

const msgGoto = gettext("Go to");

interface WebMapFeatureGridTabProps {
    plugin: Record<string, unknown>;
    layerId: number;
    topic: DojoTopic;
}

export function WebMapFeatureGridTab({
    topic,
    plugin,
    layerId,
}: WebMapFeatureGridTabProps) {
    const [version, setVersion] = useState(0);
    const [query, setQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const topicHandlers = useRef<TopicSubscription[]>([]);

    const display = useRef<DojoDisplay>(plugin.display as DojoDisplay);
    const itemConfig = useRef<DisplayItemConfig>(
        display.current.get("itemConfig") as DisplayItemConfig
    );
    const data = useRef<FeatureLayerWebMapPluginConfig>(
        itemConfig.current.plugin[
            plugin.identity as string
        ] as FeatureLayerWebMapPluginConfig
    );

    const reloadLayer = useCallback(() => {
        const layer = display.current?._layers[layerId];
        layer?.reload();
    }, [layerId]);

    const featureHighlightedEvent = useCallback(
        ({
            featureId,
            layerId: eventLayerId,
        }: {
            featureId: number;
            layerId: number;
        }) => {
            if (featureId !== undefined && eventLayerId === layerId) {
                setSelectedIds([featureId]);
            } else {
                setSelectedIds([]);
            }
        },
        [layerId]
    );

    const featureUpdatedEvent = useCallback(
        ({ resourceId }: { resourceId: number }) => {
            if (layerId === resourceId) {
                setVersion((old) => old + 1);
                reloadLayer();
            }
        },
        [layerId, reloadLayer]
    );

    const subscribe = useCallback(() => {
        topicHandlers.current.push(
            topic.subscribe("feature.highlight", featureHighlightedEvent),
            topic.subscribe(
                "feature.unhighlight",
                setSelectedIds.bind(null, [])
            ),
            topic.subscribe("feature.updated", featureUpdatedEvent),
            topic.subscribe(
                "/webmap/feature-table/refresh",
                setQuery.bind(null, "")
            )
        );
    }, [featureHighlightedEvent, featureUpdatedEvent, topic]);

    const unsubscribe = () => {
        topicHandlers.current.forEach((handler) => handler.remove());
        topicHandlers.current = [];
    };

    const zoomToFeature = useCallback(() => {
        const wkt = new WKT();
        const fid = selectedIds[0];
        if (fid !== undefined) {
            route("feature_layer.feature.item", { id: layerId, fid })
                .get<FeatureItem>()
                .then((feature) => {
                    const geometry = wkt.readGeometry(feature.geom);
                    display.current.map.zoomToFeature(
                        new Feature({ geometry })
                    );
                });
        }
    }, [layerId, selectedIds]);

    useEffect(() => {
        subscribe();

        const highlightedFeatures =
            display.current.featureHighlighter.getHighlighted();
        const selected: number[] = highlightedFeatures
            .filter((f) => f.getProperties?.()?.layerId === layerId)
            .map((f) => f.getProperties().featureId);

        setSelectedIds(selected);

        return unsubscribe;
    }, [subscribe, layerId]);

    const featureGridProps = useMemo<FeatureGridProps>(() => {
        return {
            id: layerId,
            query,
            readonly: data.current?.readonly ?? true,
            size: "small",
            cleanSelectedOnFilter: false,
            onDelete: reloadLayer,
            onSave: () => {
                display.current.identify._popup.widget?.reset();
                reloadLayer();
            },
            onSelect: function (newVal) {
                setSelectedIds(newVal);
                const fid = newVal[0];
                if (fid !== undefined) {
                    route("feature_layer.feature.item", { id: layerId, fid })
                        .get<FeatureItem>()
                        .then((feature) => {
                            display.current.featureHighlighter.highlightFeature(
                                {
                                    geom: feature.geom,
                                    featureId: feature.id,
                                    layerId,
                                }
                            );
                        });
                } else {
                    display.current.featureHighlighter.unhighlightFeature(
                        (f) => f?.getProperties?.()?.layerId === layerId
                    );
                }
            },
            actions: [
                {
                    title: msgGoto,
                    icon: "material-center_focus_weak",
                    disabled: (params) => !params?.selected?.length,
                    action: zoomToFeature,
                },
                "separator",
                (props) => (
                    <ZoomToFilteredBtn
                        {...props}
                        onZoomToFiltered={(ngwExtent: NgwExtent) => {
                            display.current.map.zoomToNgwExtent(
                                ngwExtent,
                                display.current.displayProjection
                            );
                        }}
                    />
                ),
            ],
        };
    }, [layerId, query, reloadLayer, zoomToFeature]);

    return (
        <FeatureGrid
            selectedIds={selectedIds}
            version={version}
            {...featureGridProps}
        />
    );
}
