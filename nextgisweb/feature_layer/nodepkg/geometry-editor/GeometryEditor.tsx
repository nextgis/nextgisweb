import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import type { SizeType } from "@nextgisweb/gui/fields-form";
import { DeleteIcon } from "@nextgisweb/gui/icon";
import { convertWSENToNgwExtent } from "@nextgisweb/gui/util/extent";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl, NGWLayer } from "@nextgisweb/webmap/map-component";
import type { LayerOptions } from "@nextgisweb/webmap/map-component/hook/useNGWLayer";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import { getFeatureStyle } from "../geometry-info/component/GeometryInfoPreview";

import { DrawInteraction } from "./DrawInteraction";
import { EditableVectorLayer } from "./EditableVectorLayer";
import GeometryEditorStore from "./GeometryEditorStore";
import type { FeatureGeometry } from "./GeometryEditorStore";

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
        const [store] = useState(() => {
            if (storeProp) {
                return storeProp;
            }
            return new GeometryEditorStore();
        });

        const { isReady, geometryType, singleMode, source, value, initExtent } =
            store;

        const featureId = store._parentStore?.featureId;

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

        if (!isReady || !geometryType || !store._parentStore) {
            return <LoadingWrapper />;
        }

        return (
            <PreviewMap
                style={{ width: "100%", height: "100%" }}
                basemap
                mapExtent={
                    initExtent
                        ? {
                              extent: convertWSENToNgwExtent(initExtent),
                              padding,
                              srs: { id: 4326 },
                          }
                        : undefined
                }
            >
                <EditableVectorLayer source={source} />
                <DrawInteraction
                    source={source}
                    geometryType={geometryType}
                    singleMode={singleMode}
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
                <NGWLayer
                    resourceId={store._parentStore?.resourceId}
                    layerType="MVT"
                    layerOptions={layerOptions}
                />
            </PreviewMap>
        );
    }
);

GeometryEditor.displayName = "GeometryEditor";

export default GeometryEditor;
