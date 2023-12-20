import Feature from "ol/Feature";
import WKT from "ol/format/WKT";
import { useCallback, useEffect, useRef, useState } from "react";

import FeatureGrid from "@nextgisweb/feature-layer/feature-grid";
import { FeatureGridStore } from "@nextgisweb/feature-layer/feature-grid/FeatureGridStore";
import type { ActionProps } from "@nextgisweb/feature-layer/feature-grid/type";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import type { NgwExtent } from "@nextgisweb/feature-layer/type/FeatureExtent";
import { route } from "@nextgisweb/pyramid/api/route";
import { gettext } from "@nextgisweb/pyramid/i18n";
import FilterExtentBtn from "@nextgisweb/webmap/filter-extent-btn";
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
        const layer = display.current?.webmapStore.getLayer(layerId);
        layer?.reload();
    }, [layerId]);

    const [store] = useState(
        () =>
            new FeatureGridStore({
                id: layerId,
                readonly: data.current?.readonly ?? true,
                size: "small",
                cleanSelectedOnFilter: false,
                onDelete: reloadLayer,
                onSave: () => {
                    display.current.identify._popup.widget?.reset();
                    reloadLayer();
                },

                onSelect: (newVal) => {
                    store.setSelectedIds(newVal);
                    const fid = newVal[0];
                    if (fid !== undefined) {
                        route("feature_layer.feature.item", {
                            id: layerId,
                            fid,
                        })
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
                        disabled: (params) => !params?.selectedIds?.length,
                        action: () => {
                            const wkt = new WKT();
                            const fid = store.selectedIds[0];
                            if (fid !== undefined) {
                                route("feature_layer.feature.item", {
                                    id: layerId,
                                    fid,
                                })
                                    .get<FeatureItem>()
                                    .then((feature) => {
                                        const geometry = wkt.readGeometry(
                                            feature.geom
                                        );
                                        display.current.map.zoomToFeature(
                                            new Feature({ geometry })
                                        );
                                    });
                            }
                        },
                    },
                    "separator",
                    (props) => (
                        <ZoomToFilteredBtn
                            {...props}
                            queryParams={store.queryParams}
                            onZoomToFiltered={(ngwExtent: NgwExtent) => {
                                display.current.map.zoomToNgwExtent(
                                    ngwExtent,
                                    display.current.displayProjection
                                );
                            }}
                        />
                    ),
                    (props: ActionProps) => {
                        return (
                            <FilterExtentBtn
                                {...props}
                                display={display.current}
                                onGeomChange={(_, geomWKT) => {
                                    store.setQueryParams((prev) => ({
                                        ...prev,
                                        intersects: geomWKT,
                                    }));
                                }}
                            />
                        );
                    },
                ],
            })
    );

    const featureHighlightedEvent = useCallback(
        ({
            featureId,
            layerId: eventLayerId,
        }: {
            featureId: number;
            layerId: number;
        }) => {
            if (featureId !== undefined && eventLayerId === layerId) {
                store.setSelectedIds([featureId]);
            } else {
                store.setSelectedIds([]);
            }
        },
        [layerId, store]
    );

    const featureUpdatedEvent = useCallback(
        ({ resourceId }: { resourceId: number }) => {
            if (layerId === resourceId) {
                store.bumpVersion();
                reloadLayer();
            }
        },
        [layerId, reloadLayer, store]
    );

    const subscribe = useCallback(() => {
        topicHandlers.current.push(
            topic.subscribe("feature.highlight", featureHighlightedEvent),
            topic.subscribe(
                "feature.unhighlight",
                store.setSelectedIds.bind(null, [])
            ),
            topic.subscribe("feature.updated", featureUpdatedEvent),
            topic.subscribe("/webmap/feature-table/refresh", () => {
                store.setQueryParams(null);
                store.bumpVersion();
            })
        );
    }, [featureHighlightedEvent, featureUpdatedEvent, topic, store]);

    const unsubscribe = () => {
        topicHandlers.current.forEach((handler) => handler.remove());
        topicHandlers.current = [];
    };

    useEffect(() => {
        subscribe();

        const highlightedFeatures =
            display.current.featureHighlighter.getHighlighted();
        const selected: number[] = highlightedFeatures
            .filter((f) => f.getProperties?.()?.layerId === layerId)
            .map((f) => f.getProperties().featureId);

        store.setSelectedIds(selected);

        return unsubscribe;
    }, [subscribe, layerId, store]);

    return <FeatureGrid id={layerId} store={store} />;
}
