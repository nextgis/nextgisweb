import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import type { SizeType } from "@nextgisweb/gui/fields-form";
import { DeleteIcon } from "@nextgisweb/gui/icon";
import { convertWSENToNgwExtent } from "@nextgisweb/gui/util/extent";
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
import { DEFAULT_PADDING, DEFAULT_SRS } from "./constant";
import { ZoomToResourceBtn } from "./util/component/ZoomToResourceBtn";
import { fetchResourceExtent } from "./util/fetchResourceExtent";

type GeometryEditorStoreProps = EditorWidgetProps<
    GeometryEditorStore,
    {
        size?: SizeType;
        onChange?: (value: FeatureGeometry | null) => void;
    }
>;

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
        const [extent] = useState(() => {
            return initExtent ? convertWSENToNgwExtent(initExtent) : undefined;
        });
        const [initialExtentLoading, setInitialExtentLoading] =
            useState(!initExtent);
        const [initialExtent, setInitialExtent] = useState(extent);
        const featureId = store._parentStore?.featureId;

        const fetchLayerExtent = useCallback(async () => {
            abort();
            const resourceId = store._parentStore?.resourceId;
            if (resourceId !== undefined) {
                const signal = makeSignal();
                const resExtent = await fetchResourceExtent({
                    signal,
                    resourceId,
                });
                if (
                    !resExtent ||
                    Object.values(resExtent).some((v) => v === null)
                ) {
                    return undefined;
                }
                return resExtent;
            }
        }, [abort, makeSignal, store]);

        useEffect(() => {
            if (initExtent === undefined) {
                fetchLayerExtent()
                    .then((ext) => {
                        setInitialExtent(ext);
                    })
                    .finally(() => {
                        setInitialExtentLoading(false);
                    });
            }
        }, [fetchLayerExtent, initExtent]);

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
                ? {
                      extent: initialExtent,
                      padding: DEFAULT_PADDING,
                      srs: DEFAULT_SRS,
                  }
                : undefined;
        }, [initialExtent]);

        if (!isReady || !geometryType || initialExtentLoading) {
            return <LoadingWrapper />;
        }

        return (
            <PreviewMap
                style={{ width: "100%", height: "100%" }}
                basemap
                initialMapExtent={initialMapExtent}
            >
                <EditableVectorLayer source={source} />
                <DrawInteraction
                    source={source}
                    geometryType={geometryType}
                    multiGeometry={multiGeometry}
                />
                {store._parentStore?.resourceId && (
                    <>
                        {initExtent && (
                            <ZoomToResourceBtn
                                resourceId={store._parentStore.resourceId}
                            />
                        )}
                        <NGWLayer
                            resourceId={store._parentStore.resourceId}
                            layerType="MVT"
                            layerOptions={layerOptions}
                        />
                    </>
                )}
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
            </PreviewMap>
        );
    }
);

GeometryEditor.displayName = "GeometryEditor";

export default GeometryEditor;
