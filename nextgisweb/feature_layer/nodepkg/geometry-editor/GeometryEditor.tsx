import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { isAbortError } from "@nextgisweb/gui/error";
import type { SizeType } from "@nextgisweb/gui/fields-form";
import { DeleteIcon } from "@nextgisweb/gui/icon";
import { convertWSENToNgwExtent } from "@nextgisweb/gui/util/extent";
import { extentInterfaces } from "@nextgisweb/layer-preview/constant";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl, NGWLayer } from "@nextgisweb/webmap/map-component";
import type { LayerOptions } from "@nextgisweb/webmap/map-component/hook/useNGWLayer";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import { getFeatureStyle } from "../geometry-info/component/GeometryInfoPreview";

import { DrawInteraction } from "./DrawInteraction";
import { EditableVectorLayer } from "./EditableVectorLayer";
import GeometryEditorStore from "./GeometryEditorStore";
import type { FeatureGeometry } from "./GeometryEditorStore";

import ZoomInMapIcon from "@nextgisweb/icon/material/zoom_in_map/outline";

type GeometryEditorStoreProps = EditorWidgetProps<
    GeometryEditorStore,
    {
        size?: SizeType;
        onChange?: (value: FeatureGeometry | null) => void;
    }
>;

const padding = [20, 20, 20, 20];

const GeometryEditor = observer(
    ({ store: storeProp }: GeometryEditorStoreProps) => {
        const { makeSignal, abort } = useAbortController();

        const [store] = useState(() => {
            if (storeProp) {
                return storeProp;
            }
            return new GeometryEditorStore();
        });

        const {
            isReady,
            geometryType,
            multiGeometry,
            source,
            value,
            initExtent,
        } = store;
        const [extent, setExtent] = useState(() => {
            return initExtent ? convertWSENToNgwExtent(initExtent) : undefined;
        });
        const [initialExtent, setInitialExtent] = useState(extent);
        const featureId = store._parentStore?.featureId;

        const getExtent = useCallback(async () => {
            abort();
            const id = store._parentStore?.resourceId;
            if (id !== undefined) {
                try {
                    const signal = makeSignal();
                    const resData = await route("resource.item", id).get({
                        signal,
                        cache: true,
                    });
                    if (resData) {
                        if (
                            resData.resource.interfaces.some((iface) =>
                                extentInterfaces.includes(iface)
                            )
                        ) {
                            const data = await route("layer.extent", id).get({
                                signal,
                                cache: true,
                            });
                            setExtent(data.extent);
                            return data.extent;
                        }
                    }
                } catch (er) {
                    if (!isAbortError(er)) {
                        throw er;
                    }
                }
            }
        }, [abort, makeSignal, store]);

        useEffect(() => {
            if (initExtent === undefined) {
                getExtent().then((extent) => {
                    setInitialExtent(extent);
                });
            }
        }, [getExtent, initExtent]);

        const layerOptions = useMemo<LayerOptions>(() => {
            return {
                style: (feature) => {
                    const isHighlighted =
                        String(feature.getId()) === String(featureId);
                    if (isHighlighted) {
                        return undefined;
                    }
                    return getFeatureStyle(feature);
                },
            };
        }, [featureId]);

        const initialMapExtent = useMemo(() => {
            return initialExtent
                ? { extent: initialExtent, padding, srs: { id: 4326 } }
                : undefined;
        }, [initialExtent]);

        const mapExtent = useMemo(() => {
            return extent
                ? {
                      extent,
                      padding,
                      srs: { id: 4326 },
                  }
                : undefined;
        }, [extent]);

        if (!isReady || !geometryType || !initialExtent) {
            return <LoadingWrapper />;
        }

        return (
            <PreviewMap
                style={{ width: "100%", height: "100%" }}
                basemap
                initialMapExtent={initialMapExtent}
                mapExtent={mapExtent}
            >
                <EditableVectorLayer source={source} />
                <DrawInteraction
                    source={source}
                    geometryType={geometryType}
                    multiGeometry={multiGeometry}
                />
                {value && (
                    <ButtonControl
                        position="top-left"
                        onClick={() => {
                            store.source.clear();
                        }}
                        title={gettext("Clear")}
                    >
                        <DeleteIcon />
                    </ButtonControl>
                )}
                {store._parentStore?.resourceId && (
                    <>
                        {initExtent && (
                            <ButtonControl
                                position="top-left"
                                onClick={getExtent}
                                title={gettext("Zoom to layer extent")}
                            >
                                <ZoomInMapIcon />
                            </ButtonControl>
                        )}
                        <NGWLayer
                            resourceId={store._parentStore?.resourceId}
                            layerType="MVT"
                            layerOptions={layerOptions}
                        />
                    </>
                )}
            </PreviewMap>
        );
    }
);

GeometryEditor.displayName = "GeometryEditor";

export default GeometryEditor;
