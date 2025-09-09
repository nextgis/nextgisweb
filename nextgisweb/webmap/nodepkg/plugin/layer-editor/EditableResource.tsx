import { observer } from "mobx-react-lite";
import { Collection } from "ol";
import type { Feature as OlFeature } from "ol";
import type { Geometry } from "ol/geom";
import type { DrawEvent } from "ol/interaction/Draw";
import VectorSource from "ol/source/Vector";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { useShowModal } from "@nextgisweb/gui/index";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { ButtonControl } from "@nextgisweb/webmap/map-component";

import { EditableItem } from "./EditableItem";
import type { EditableItemProps } from "./EditableItem";
import { SnapToggle } from "./SnapToggle";
import { fetchResourceOlFeature, getGeomConfig } from "./editor-api";
import type { GeomConfig } from "./editor-api";
import { AttributeMode } from "./modes/AttributeMode";
import { DeleteMode } from "./modes/DeleteMode";
import { DrawMode } from "./modes/DrawMode";
import { ModifyMode } from "./modes/ModifyMode";
import { MoveMode } from "./modes/MoveMode";

import { LoadingOutlined } from "@ant-design/icons";

export interface EditableResourceProps
    extends Omit<EditableItemProps, "geomType" | "geomLayout"> {
    resourceId: number;
    canSnap: boolean;
    onCanSnap: (val: boolean) => void;
}

export const EditableResource = observer(
    ({
        editingMode,
        resourceId,
        canSnap,
        enabled,
        source: outerSource,
        onCanSnap: setCanSnap,
        onDirtyChange,
        onEditingMode: setEditingMode,
    }: EditableResourceProps) => {
        const { modalStore, modalHolder, lazyModal } = useShowModal();
        const { makeSignal } = useAbortController();

        const [source, setSource] = useState<VectorSource | null>(null);

        const [isLoading, startTransition] = useTransition();

        const [geomConfig, setGeometryConfig] = useState<GeomConfig | null>(
            null
        );

        const editingModeRef = useRef(editingMode);
        useEffect(() => {
            editingModeRef.current = editingMode;
        }, [editingMode]);

        const onDrawend = useCallback(
            (ev: DrawEvent) => {
                lazyModal(
                    () =>
                        import(
                            "@nextgisweb/feature-layer/feature-editor-modal"
                        ),
                    {
                        skipDirtyCheck: true,
                        editorOptions: {
                            mode: "return",
                            showGeometryTab: false,
                            resourceId,
                            onOk: (_, item) => {
                                ev.feature.set("attribution", item);
                            },
                        },
                    }
                );
            },
            [lazyModal, resourceId]
        );

        useEffect(() => {
            startTransition(async () => {
                setGeometryConfig(null);
                try {
                    const config = await getGeomConfig({
                        resourceId,
                        signal: makeSignal(),
                    });
                    setGeometryConfig(config);
                } catch (er) {
                    errorModal(er, { modalStore });
                }
            });
        }, [makeSignal, modalStore, resourceId]);

        useEffect(() => {
            if (!geomConfig) return;

            const source = outerSource || new VectorSource();
            const features = new Collection<OlFeature<Geometry>>();
            startTransition(async () => {
                try {
                    const olFeatures = await fetchResourceOlFeature({
                        resourceId,
                        signal: makeSignal(),
                    });
                    features.extend(olFeatures);
                    source.addFeatures(olFeatures);
                    setSource(source);
                } catch (err) {
                    errorModal(err, { modalStore });
                }
            });
            const clearSource = () => {
                if (outerSource) {
                    features.forEach((feature) => {
                        source.removeFeature(feature);
                    });
                } else {
                    source.clear();
                }
            };

            return clearSource;
        }, [geomConfig, makeSignal, modalStore, outerSource, resourceId]);

        return (
            <>
                {modalHolder}
                {isLoading || !source || !geomConfig ? (
                    <ButtonControl order={90} disabled>
                        <Spin
                            indicator={<LoadingOutlined spin />}
                            size="small"
                        />
                    </ButtonControl>
                ) : (
                    <EditableItem
                        id={resourceId}
                        source={source}
                        enabled={enabled}
                        geomType={geomConfig.type}
                        geomLayout={geomConfig.layout}
                        editingMode={editingMode}
                        onEditingMode={setEditingMode}
                        onDirtyChange={onDirtyChange}
                    >
                        <ModifyMode order={1} />
                        <MoveMode order={2} />
                        <DrawMode order={3} onDrawend={onDrawend} />
                        <DeleteMode order={4} />
                        <AttributeMode order={5} resourceId={resourceId} />
                        {!geomConfig.type.includes("Point") && (
                            <SnapToggle
                                order={6}
                                value={canSnap}
                                onChange={setCanSnap}
                            />
                        )}
                    </EditableItem>
                )}
            </>
        );
    }
);

EditableResource.displayName = "EditableResource";
