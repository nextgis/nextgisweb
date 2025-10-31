import { unByKey } from "ol/Observable";
import type VectorSource from "ol/source/Vector";
import { useEffect, useState } from "react";

import { DeleteIcon } from "@nextgisweb/gui/icon";
import { MapToolbarControl } from "@nextgisweb/webmap/map-component";
import { useToggleGroupItem } from "@nextgisweb/webmap/map-component/control/toggle-group";
import { EditableItem } from "@nextgisweb/webmap/plugin/layer-editor/EditableItem";
import { ClearAllBtn } from "@nextgisweb/webmap/plugin/layer-editor/modes/ClearAllBtn";
import { MoveMode } from "@nextgisweb/webmap/plugin/layer-editor/modes/MoveMode";
import { RectEditMode } from "@nextgisweb/webmap/plugin/layer-editor/modes/RectEditMode";

interface ExtentEditorControlPanelProps {
    source: VectorSource;
    order?: number;
}

export function ExtentEditorControlPanel({
    source,
    order = 10,
}: ExtentEditorControlPanelProps) {
    const [featuresLength, setFeaturesLength] = useState<number | null>(null);
    const { activate, isActive } = useToggleGroupItem("extent-editor");

    const [editingMode, setEditingMode] = useState<string | null>(
        RectEditMode.displayName
    );

    useEffect(() => {
        const unChange = source.on("change", () => {
            const len = source.getFeatures().length;
            setFeaturesLength(len);
        });
        return () => {
            unByKey(unChange);
        };
    }, [source]);

    useEffect(() => {
        if (editingMode) {
            activate();
        }
    }, [editingMode, activate]);

    return (
        <MapToolbarControl
            order={order}
            id="extent-toolbar"
            position="top-right"
            margin
            direction="vertical"
            style={{ paddingTop: "20px" }}
            gap={4}
        >
            <EditableItem
                enabled
                source={source}
                editingMode={isActive ? editingMode : null}
                onEditingMode={setEditingMode}
                onDirtyChange={() => {}}
            >
                <RectEditMode order={1} clearPrevious />
                <MoveMode disabled={!featuresLength} order={2} />
                <ClearAllBtn
                    disabled={!featuresLength}
                    order={4}
                    icon={<DeleteIcon />}
                />
            </EditableItem>
        </MapToolbarControl>
    );
}
