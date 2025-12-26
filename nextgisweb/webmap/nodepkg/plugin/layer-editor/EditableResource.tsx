import { observer } from "mobx-react-lite";
import { Collection } from "ol";
import type { Feature as OlFeature } from "ol";
import type { Geometry } from "ol/geom";
import type { DrawEvent } from "ol/interaction/Draw";
import VectorSource from "ol/source/Vector";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Spin } from "@nextgisweb/gui/antd";
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
import { HoleMode } from "./modes/HoleMode";
import { ModifyMode } from "./modes/ModifyMode";
import { MoveMode } from "./modes/MoveMode";

import { LoadingOutlined } from "@ant-design/icons";

export interface EditableResourceProps extends Omit<
    EditableItemProps,
    "geomType" | "geomLayout"
> {
    resourceId: number;
    canSnap: boolean;
    onError: (er: unknown) => void;
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
        onError,
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
                return new Promise<void>((resolve, reject) => {
                    lazyModal(
                        () =>
                            import("@nextgisweb/feature-layer/feature-editor-modal"),
                        {
                            editorOptions: {
                                mode: "return",
                                allowEmpty: true,
                                resourceId,
                                showGeometryTab: false,
                                onOk: (_, item) => {
                                    ev.feature.set("attribution", item);
                                    resolve(undefined);
                                },
                            },
                            onCancel: () => {
                                reject("Canceled by user");
                            },
                        }
                    );
                });
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
                    onError(er);
                }
            });
        }, [makeSignal, onError, modalStore, resourceId]);

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
                } catch (er) {
                    onError(er);
                }
            });
            const clearSource = () => {
                if (outerSource) {
                    source.forEachFeature((f) => {
                        if (f.get("layer_id") === resourceId)
                            source.removeFeature(f);
                    });
                } else {
                    source.clear();
                }
            };

            return clearSource;
        }, [
            modalStore,
            geomConfig,
            resourceId,
            outerSource,
            makeSignal,
            onError,
        ]);

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
                        editingMode={editingMode}
                        onEditingMode={setEditingMode}
                        onDirtyChange={onDirtyChange}
                    >
                        <DrawMode
                            order={1}
                            onDrawend={onDrawend}
                            geomType={geomConfig.type}
                            geomLayout={geomConfig.layout}
                        />
                        <ModifyMode order={2} />
                        <MoveMode order={3} />
                        {geomConfig.type.includes("Polygon") && (
                            <HoleMode order={4} />
                        )}
                        <AttributeMode order={5} resourceId={resourceId} />
                        <DeleteMode order={6} />
                        {!geomConfig.type.includes("Point") && (
                            <SnapToggle
                                order={7}
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
