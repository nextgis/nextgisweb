import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import type { ControlPosition } from "@nextgisweb/webmap/control-container/ControlContainer";
import { MapToolbarControl } from "@nextgisweb/webmap/map-component";
import { useToggleGroupItem } from "@nextgisweb/webmap/map-component/control/toggle-group";
import { EditableItem } from "@nextgisweb/webmap/plugin/layer-editor/EditableItem";
import { ClearAllBtn } from "@nextgisweb/webmap/plugin/layer-editor/modes/ClearAllBtn";
import { DeleteMode } from "@nextgisweb/webmap/plugin/layer-editor/modes/DeleteMode";
import { DrawMode } from "@nextgisweb/webmap/plugin/layer-editor/modes/DrawMode";
import { HoleMode } from "@nextgisweb/webmap/plugin/layer-editor/modes/HoleMode";
import { ModifyMode } from "@nextgisweb/webmap/plugin/layer-editor/modes/ModifyMode";
import { MoveMode } from "@nextgisweb/webmap/plugin/layer-editor/modes/MoveMode";
import {
    getOlGeometryType,
    getOlLayout,
} from "@nextgisweb/webmap/utils/geometry-types";

import type GeometryEditorStore from "./GeometryEditorStore";

interface GeometryEditorControlPanelProps {
    store: GeometryEditorStore;
    order?: number;
    position?: ControlPosition;
}

export const GeometryEditorControlPanel = observer(
    ({ store, order, position }: GeometryEditorControlPanelProps) => {
        const { geometryType, source, value, multiGeometry } = store;
        const [editingMode, setEditingMode] = useState<string | null>(() =>
            value ? ModifyMode.displayName : DrawMode.displayName
        );
        const { activate, isActive } = useToggleGroupItem("geometry-editor");

        useEffect(() => {
            if (editingMode) {
                activate();
            }
        }, [editingMode, activate]);

        if (!geometryType || !source) {
            return null;
        }

        return (
            <MapToolbarControl
                position={position}
                margin
                order={order}
                direction="vertical"
                gap={2}
                id="editor-toolbar"
            >
                <EditableItem
                    source={source}
                    enabled
                    editingMode={isActive ? editingMode : null}
                    onEditingMode={setEditingMode}
                >
                    <DrawMode
                        order={1}
                        geomType={getOlGeometryType(geometryType)}
                        geomLayout={getOlLayout(geometryType)}
                        clearPrevious={!multiGeometry}
                    />

                    {value && (
                        <>
                            <ModifyMode order={2} />
                            <MoveMode order={3} />
                            {geometryType.includes("POLYGON") && (
                                <HoleMode order={4} />
                            )}
                            {store.multiGeometry && <DeleteMode order={6} />}
                            <ClearAllBtn order={8} />
                        </>
                    )}
                </EditableItem>
            </MapToolbarControl>
        );
    }
);

GeometryEditorControlPanel.displayName = "GeometryEditor";
