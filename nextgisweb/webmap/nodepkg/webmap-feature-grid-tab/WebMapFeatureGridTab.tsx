import Feature from "ol/Feature";
import WKT from "ol/format/WKT";
import { useEffect, useRef, useState } from "react";

import { FeatureGrid } from "@nextgisweb/feature-layer/feature-grid/FeatureGrid";
import { FeatureGridStore } from "@nextgisweb/feature-layer/feature-grid/FeatureGridStore";
import type { ActionProps } from "@nextgisweb/feature-layer/feature-grid/type";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import { message } from "@nextgisweb/gui/antd";
import type { NoticeType } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api/route";
import { gettext } from "@nextgisweb/pyramid/i18n";
import FilterExtentBtn from "@nextgisweb/webmap/filter-extent-btn";
import ZoomToFilteredBtn from "@nextgisweb/webmap/zoom-to-filtered-btn";

import type topic from "../compat/topic";
import { useDisplayContext } from "../display/context";
import type { PluginBase } from "../plugin/PluginBase";
import type { FeatureLayerWebMapPluginConfig } from "../plugin/type";

import GoToIcon from "@nextgisweb/icon/material/center_focus_weak";

const msgGoto = gettext("Go to");

interface WebMapFeatureGridTabProps {
    plugin: PluginBase;
    layerId: number;
    topic: typeof topic;
}

export function WebMapFeatureGridTab({
    topic,
    plugin,
    layerId,
}: WebMapFeatureGridTabProps) {
    const topicHandlers = useRef<ReturnType<typeof topic.subscribe>[]>([]);
    const { display } = useDisplayContext();

    const [editorProps] = useState(() => ({ showGeometryTab: false }));

    const [featureStore, setFeatureStore] = useState<FeatureGridStore | null>(
        null
    );

    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        const itemFromStore = Object.values(
            display.itemStore.fetch({ query: { type: "layer", layerId } })
        )[0];
        if (!itemFromStore) return;
        const item = display.getItemConfig()[itemFromStore.id];
        if (!item || item.type !== "layer") return;

        const data = item.plugin[
            plugin.identity
        ] as FeatureLayerWebMapPluginConfig;

        const showMessage = (type: NoticeType, content: string) => {
            messageApi.open({
                type: type,
                content: content,
            });
        };

        const reloadLayer = async () => {
            // It is possible to have few webmap layers for one resource id
            const layers = await display.webmapStore.filterLayers({
                query: { layerId },
            });

            layers?.forEach((item) => {
                const layer = display.webmapStore.getLayer(item.id);
                layer?.reload();
            });
        };

        const store = new FeatureGridStore({
            id: layerId,
            readonly: data.readonly ?? true,
            size: "small",
            cleanSelectedOnFilter: false,
            canCreate: false,
            onDelete: reloadLayer,
            onSave: reloadLayer,

            onOpen: ({ featureId, resourceId }) => {
                display.identify.identifyFeatureByAttrValue(
                    resourceId,
                    "id",
                    featureId
                );
            },

            onSelect: (newVal) => {
                store.setSelectedIds(newVal);
                const fid = newVal[0];
                if (fid !== undefined) {
                    route("feature_layer.feature.item", {
                        id: layerId,
                        fid,
                    })
                        .get<FeatureItem>({
                            query: {
                                dt_format: "iso",
                                fields: [],
                                extensions: [],
                            },
                        })
                        .then((feature) => {
                            display.featureHighlighter.highlightFeature({
                                geom: feature.geom,
                                featureId: feature.id,
                                layerId,
                            });
                        });
                } else {
                    display.featureHighlighter.unhighlightFeature(
                        (f) => f?.getProperties?.()?.layerId === layerId
                    );
                }
            },
            actions: [
                {
                    title: msgGoto,
                    icon: <GoToIcon />,
                    disabled: (params) => !params?.selectedIds?.length,
                    action: () => {
                        const wkt = new WKT();
                        const fid = store.selectedIds[0];
                        if (fid !== undefined) {
                            route("feature_layer.feature.item", {
                                id: layerId,
                                fid,
                            })
                                .get<FeatureItem>({
                                    query: {
                                        dt_format: "iso",
                                        fields: [],
                                        extensions: [],
                                    },
                                })
                                .then((feature) => {
                                    if (feature.geom !== null) {
                                        const geometry = wkt.readGeometry(
                                            feature.geom
                                        );
                                        display.map.zoomToFeature(
                                            new Feature({ geometry })
                                        );
                                    } else {
                                        showMessage(
                                            "warning",
                                            gettext(
                                                "Selected feature has no geometry"
                                            )
                                        );
                                    }
                                });
                        }
                    },
                },
                "separator",
                (props) => (
                    <>
                        <ZoomToFilteredBtn
                            {...props}
                            queryParams={store.queryParams}
                            onZoomToFiltered={(ngwExtent: NgwExtent) => {
                                display.map.zoomToNgwExtent(ngwExtent, {
                                    displayProjection:
                                        display.displayProjection,
                                });
                            }}
                        />
                    </>
                ),
                (props: ActionProps) => {
                    return (
                        <FilterExtentBtn
                            {...props}
                            display={display}
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
        });

        const featureUpdatedEvent = ({
            resourceId,
        }: {
            resourceId: number;
        }) => {
            if (layerId === resourceId) {
                store.bumpVersion();
                reloadLayer();
            }
        };

        const featureHighlightedEvent = ({
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
        };

        const subscribe = () => {
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
        };

        const unsubscribe = () => {
            topicHandlers.current.forEach((handler) => handler.remove());
            topicHandlers.current = [];
        };

        subscribe();

        const highlightedFeatures = display.featureHighlighter.getHighlighted();
        const selected: number[] = highlightedFeatures
            .filter((f) => f.getProperties?.()?.layerId === layerId)
            .map((f) => f.getProperties().featureId);

        store.setSelectedIds(selected);

        setFeatureStore(store);

        return () => {
            setFeatureStore(null);
            unsubscribe();
        };
    }, [topic, display, layerId, messageApi, plugin.identity]);

    if (!featureStore) {
        return null;
    }

    return (
        <>
            {contextHolder}
            <FeatureGrid
                id={layerId}
                store={featureStore}
                editorProps={editorProps}
            />
        </>
    );
}
