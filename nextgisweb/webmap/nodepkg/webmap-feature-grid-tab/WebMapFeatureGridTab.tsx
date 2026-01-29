import { observer } from "mobx-react-lite";
import Feature from "ol/Feature";
import WKT from "ol/format/WKT";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import type { TreeLayerStore } from "../store/tree-store/TreeItemStore";

import GoToIcon from "@nextgisweb/icon/material/center_focus_weak";

const msgGoto = gettext("Go to");

interface WebMapFeatureGridTabProps {
    plugin: PluginBase;
    item: TreeLayerStore;
    topic: typeof topic;
}

export const WebMapFeatureGridTab = observer(
    ({ topic, plugin, item }: WebMapFeatureGridTabProps) => {
        const { layerId, filter } = item;
        const filterRef = useRef(filter);
        const topicHandlers = useRef<ReturnType<typeof topic.subscribe>[]>([]);
        const { display } = useDisplayContext();

        const [editorProps] = useState(() => ({ showGeometryTab: false }));

        const [featureStore, setFeatureStore] =
            useState<FeatureGridStore | null>(null);

        const [messageApi, contextHolder] = message.useMessage();

        const reloadLayer = useCallback(() => {
            // It is possible to have few webmap layers for one resource id
            const layers = display.treeStore.filter({
                type: "layer",
                layerId,
            });

            layers?.forEach((item) => {
                display.map.getLayer(item.id)?.reload();
            });
        }, [display.map, display.treeStore, layerId]);

        const store = useMemo(() => {
            const item = Object.values(
                display.treeStore.filter({ type: "layer", layerId })
            )[0];
            if (!item) return;

            if (!item || item.type !== "layer") return;

            const data = item.plugin[
                plugin.identity
            ] as FeatureLayerWebMapPluginConfig;

            const showMessage = (type: NoticeType, content: string) => {
                messageApi.open({
                    type,
                    content,
                });
            };

            const store = new FeatureGridStore({
                id: layerId,
                readonly: data.readonly ?? true,
                size: "small",
                cleanSelectedOnFilter: false,
                canCreate: false,
                globalFilterExpression: filterRef.current ?? undefined,
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
                                display.highlighter.highlight({
                                    geom: feature.geom,
                                    featureId: feature.id,
                                    layerId,
                                });
                            });
                    } else {
                        display.highlighter.unhighlight(
                            (e) => e.layerId === layerId
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

            return store;
        }, [display, layerId, messageApi, plugin.identity, reloadLayer]);

        useEffect(() => {
            if (store) {
                store.setGlobalFilterExpression(filter ?? undefined);
            }
            filterRef.current = filter;
        }, [store, filter]);

        useEffect(() => {
            if (!store) return;
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

            const subscribe = () => {
                topicHandlers.current.push(
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

            setFeatureStore(store);

            return () => {
                setFeatureStore(null);
                unsubscribe();
            };
        }, [
            topic,
            display,
            layerId,
            messageApi,
            plugin.identity,
            store,
            reloadLayer,
        ]);

        useEffect(() => {
            if (!store) return;
            const highlightedFeatures = display.highlighter.highlighted;
            const selected: number[] = [];
            highlightedFeatures.forEach((e) => {
                if (e.layerId === layerId && e.featureId) {
                    selected.push(Number(e.featureId));
                }
            });

            store.setSelectedIds(selected);
        }, [store, display.highlighter.highlighted, layerId]);

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
);

WebMapFeatureGridTab.displayName = "WebMapFeatureGridTab";
