import { useState, useRef, useEffect, useMemo, useCallback } from "react";

import WKT from "ol/format/WKT";
import Feature from "ol/Feature";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { route } from "@nextgisweb/pyramid/api/route";
import FeatureGrid from "@nextgisweb/feature-layer/feature-grid";
import ZoomToFilteredBtn from "@nextgisweb/webmap/zoom-to-filtered-btn";

import type { FeatureGridProps } from "@nextgisweb/feature-layer/feature-grid";
import type { NgwExtent } from "@nextgisweb/feature-layer/type/FeatureExtent";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import type {
    DojoTopic,
    DojoDisplay,
    DisplayItemConfig,
    FeatureLayerWebMapPluginConfig,
    TopicSubscription,
} from "../panels-manager/type";

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
        if (display.current) {
            const layer = display.current._layers[layerId];
            if (layer) {
                layer.reload();
            }
        }
    }, [layerId]);

    const updateSearch = () => {
        setQuery("");
    };

    const unsubscribe = () => {
        for (const t of topicHandlers.current) {
            t.remove();
        }
        topicHandlers.current.length = 0;
    };

    const featureUnhighlightedEvent = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const featureHighlightedEvent = useCallback(
        ({ featureId, layerId }: { featureId: number; layerId: number }) => {
            if (featureId !== undefined) {
                if (layerId === layerId) {
                    setSelectedIds([featureId]);
                } else {
                    featureUnhighlightedEvent();
                }
            }
        },
        [featureUnhighlightedEvent]
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
        unsubscribe();
        topicHandlers.current.push(
            ...[
                topic.subscribe("feature.highlight", featureHighlightedEvent),
                topic.subscribe(
                    "feature.unhighlight",
                    featureUnhighlightedEvent
                ),
                topic.subscribe("feature.updated", featureUpdatedEvent),
                topic.subscribe("/webmap/feature-table/refresh", updateSearch),
            ]
        );
    }, [
        featureHighlightedEvent,
        featureUnhighlightedEvent,
        featureUpdatedEvent,
        topic,
    ]);

    const zoomToFeature = useCallback(() => {
        const wkt = new WKT();

        const fid = selectedIds[0];
        if (fid !== undefined) {
            route("feature_layer.feature.item", {
                id: layerId,
                fid: fid,
            })
                .get<FeatureItem>()
                .then((feature) => {
                    const geometry = wkt.readGeometry(feature.geom);
                    display.current.map.zoomToFeature(
                        new Feature({ geometry })
                    );
                });
        }
    }, [layerId, selectedIds]);

    const zoomToExtent = (ngwExtent: NgwExtent) => {
        display.current.map.zoomToNgwExtent(
            ngwExtent,
            display.current.displayProjection
        );
    };

    useEffect(() => {
        subscribe();

        const highlightedFeatures =
            display.current.featureHighlighter.getHighlighted();
        const selected: number[] = [];
        for (const f of highlightedFeatures) {
            if (f.getProperties) {
                const { layerId, featureId } = f.getProperties();
                if (layerId === layerId) {
                    selected.push(featureId);
                }
            }
        }
        setSelectedIds(selected);

        return () => {
            unsubscribe();
        };
    }, [subscribe]);

    const featureGridProps = useMemo(() => {
        const props: FeatureGridProps = {
            id: layerId,
            query,
            readonly: data.current ? data.current.readonly : true,
            size: "small",
            cleanSelectedOnFilter: false,
            onDelete: function () {
                reloadLayer();
            },
            onSave: function () {
                const popupWidget = display.current.identify._popup.widget;
                if (popupWidget) {
                    popupWidget.reset();
                }
                reloadLayer();
            },
            onSelect: function (newVal) {
                setSelectedIds(newVal);
                const fid = newVal[0];
                if (fid !== undefined) {
                    route("feature_layer.feature.item", {
                        id: layerId,
                        fid: fid,
                    })
                        .get<FeatureItem>()
                        .then((feature) => {
                            display.current.featureHighlighter.highlightFeature(
                                {
                                    geom: feature.geom,
                                    featureId: feature.id,
                                    layerId: layerId,
                                }
                            );
                        });
                } else {
                    display.current.featureHighlighter.unhighlightFeature(
                        (f) => {
                            if (f && f.getProperties) {
                                const props = f.getProperties();
                                return props.layerId === layerId;
                            }
                            return true;
                        }
                    );
                }
            },
            actions: [
                {
                    title: msgGoto,
                    icon: "material-center_focus_weak",
                    disabled: (params) =>
                        params ? !params.selected?.length : false,
                    action: function () {
                        zoomToFeature();
                    },
                },
                "separator",
                (props) => (
                    <ZoomToFilteredBtn
                        {...props}
                        onZoomToFiltered={zoomToExtent}
                    />
                ),
            ],
        };
        return props;
    }, [layerId, query, reloadLayer, zoomToFeature]);

    return (
        <FeatureGrid
            selectedIds={selectedIds}
            version={version}
            {...featureGridProps}
        ></FeatureGrid>
    );
}
