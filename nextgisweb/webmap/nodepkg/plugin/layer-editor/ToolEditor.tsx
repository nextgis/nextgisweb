import { observer } from "mobx-react-lite";
import VectorSource from "ol/source/Vector";
import { useEffect, useMemo, useRef, useState } from "react";

import { errorModal } from "@nextgisweb/gui/error";
import { useShowModal } from "@nextgisweb/gui/index";
import { gettextf } from "@nextgisweb/pyramid/i18n";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";
import { ButtonControl } from "@nextgisweb/webmap/map-component";
import type { MapControlProps } from "@nextgisweb/webmap/map-component";
import MapToolbarControl from "@nextgisweb/webmap/map-component/control/MapToolbarControl";
import { useToggleGroupItem } from "@nextgisweb/webmap/map-component/control/toggle-group";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";

import { EditableResource } from "./EditableResource";
import { saveChanges } from "./editor-api";
import { DrawMode } from "./modes/DrawMode";
import { setItemsEditable } from "./util/setItemsEditable";

import ExitIcon from "@nextgisweb/icon/material/save";

type ToolEditorProps = MapControlProps & { groupId: string };

const ToolEditor = observer(
    ({ order = 0, position, groupId }: ToolEditorProps) => {
        const { display } = useDisplayContext();
        const { activate, deactivate, isActive } = useToggleGroupItem(groupId);

        const [canSnap, setCanSnap] = useState(true);
        const [editingMode, setEditingMode] = useState<string | null>(
            DrawMode.displayName
        );

        const { lazyModal, modalStore, modalHolder } = useShowModal();

        const [source] = useState(() => new VectorSource());

        const [editableItems, setEditableItems] = useState<TreeLayerStore[]>(
            []
        );

        const dirtyRef = useRef<Map<number, boolean>>(new Map());

        const { treeStore } = display;

        const prevEditableRef = useRef<TreeLayerStore[]>(editableItems);
        useEffect(() => {
            const getKey = (i: TreeLayerStore) => i.id;
            const prev = prevEditableRef.current;

            const items = treeStore.editableLayers;

            const currKeys = new Set(items.map(getKey));
            const stopped = prev
                .filter((it) => !currKeys.has(getKey(it)))
                .filter((it) => dirtyRef.current.get(getKey(it)));

            const proceed = () => {
                setEditableItems(items);
                prevEditableRef.current = items;
            };
            if (stopped.length) {
                lazyModal(
                    () =>
                        import(
                            "@nextgisweb/webmap/ui/finish-editing-dialog/FinishEditingDialog"
                        ),
                    {
                        onSave: async () => {
                            try {
                                for (const item of stopped) {
                                    await saveChanges({
                                        display,
                                        source,
                                        item,
                                    });
                                }
                            } catch (er) {
                                errorModal(er, { modalStore });
                            } finally {
                                proceed();
                            }
                        },
                        onUndo: proceed,
                        onContinue: () => {
                            setItemsEditable(
                                treeStore,
                                stopped.map((it) => it.id),
                                true
                            );
                        },
                    }
                );
            } else {
                proceed();
            }
        }, [
            source,
            display,
            modalStore,
            lazyModal,
            treeStore.editableLayers,
            treeStore,
        ]);

        const curentSelectedIsEditable = useMemo(() => {
            const itemId = display.item?.id;
            return (
                itemId !== undefined &&
                !!editableItems.find((it) => itemId === it.id)
            );
        }, [display.item, editableItems]);

        useEffect(() => {
            if (editingMode && editableItems.length) {
                if (curentSelectedIsEditable) {
                    activate();
                    return;
                }
            }
            deactivate();
        }, [
            curentSelectedIsEditable,
            editableItems.length,
            editableItems,
            editingMode,
            deactivate,
            activate,
        ]);

        if (!editableItems.length) {
            return null;
        }
        return (
            <MapToolbarControl
                order={order}
                position={position}
                margin
                direction="vertical"
                gap={2}
                style={{ paddingTop: "20px" }}
                id="editor-toolbar"
            >
                {modalHolder}
                {editableItems.map(({ id, layerId }) => (
                    <EditableResource
                        key={id}
                        source={source}
                        canSnap={canSnap}
                        enabled={display.item?.id === id}
                        resourceId={layerId}
                        editingMode={isActive ? editingMode : null}
                        onCanSnap={setCanSnap}
                        onEditingMode={setEditingMode}
                        onDirtyChange={(val) => {
                            dirtyRef.current.set(id, val);
                        }}
                    />
                ))}
                {curentSelectedIsEditable && (
                    <>
                        <ButtonControl
                            title={gettextf("Stop editing layer: {layer}")({
                                layer: display.item?.label || "",
                            })}
                            order={100}
                            onClick={() => {
                                if (display.item) {
                                    setItemsEditable(
                                        treeStore,
                                        [display.item.id],
                                        false
                                    );
                                }
                            }}
                        >
                            <ExitIcon />
                        </ButtonControl>
                    </>
                )}
            </MapToolbarControl>
        );
    }
);

ToolEditor.displayName = "ToolEditor";

export default ToolEditor;
