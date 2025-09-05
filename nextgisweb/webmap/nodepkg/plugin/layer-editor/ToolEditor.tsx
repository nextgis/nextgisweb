import { observer } from "mobx-react-lite";
import VectorSource from "ol/source/Vector";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { useUnsavedChanges } from "@nextgisweb/gui/hook";
import { DeleteIcon, EditIcon } from "@nextgisweb/gui/icon";
import { useShowModal } from "@nextgisweb/gui/index";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";
import { ButtonControl, ToggleControl } from "@nextgisweb/webmap/map-component";
import type { MapControlProps } from "@nextgisweb/webmap/map-component";
import MapToolbarControl from "@nextgisweb/webmap/map-component/control/MapToolbarControl";
import {
    ToggleGroup,
    useToggleGroupItem,
} from "@nextgisweb/webmap/map-component/control/toggle-group";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { EditableItem } from "./EditableItem";
import { EDITING_STATES } from "./constant";
import type { EditingState } from "./constant";
import { saveChanges } from "./editor-api";
import { setItemsEditable } from "./util/setItemsEditable";

import { LoadingOutlined } from "@ant-design/icons";
import type { IconComponent } from "@nextgisweb/icon/index";
import CreateIcon from "@nextgisweb/icon/material/add_box";
import AttributeIcon from "@nextgisweb/icon/material/docs";
import SnapIcon from "@nextgisweb/icon/material/join";
import ExitIcon from "@nextgisweb/icon/material/logout";
import MoveIcon from "@nextgisweb/icon/material/open_with";
import UndoIcon from "@nextgisweb/icon/material/undo";
import { useEffectDebugger } from "@nextgisweb/gui/hook/useEffectDebugger";

type ToolEditorProps = MapControlProps & { groupId: string };

const modes: [mode: string, IconComponent, title: string][] = [
    [EDITING_STATES.MODIFYING, EditIcon, gettext("Modifying")],
    [EDITING_STATES.MOVING, MoveIcon, gettext("Moving")],
    [EDITING_STATES.CREATING, CreateIcon, gettext("Creating")],
    [EDITING_STATES.DELETING, DeleteIcon, gettext("Deleting")],
    [
        EDITING_STATES.ATTRIBUTE_EDITING,
        AttributeIcon,
        gettext("Attribute editing"),
    ],
];

const ToolEditor = observer(
    ({ order = 0, position, groupId }: ToolEditorProps) => {
        const { display } = useDisplayContext();
        const groupItem = useToggleGroupItem(groupId);

        const { lazyModal, modalStore, modalHolder } = useShowModal();

        const [editingMode, setEditingMode] = useState<EditingState | null>(
            EDITING_STATES.MODIFYING
        );

        const [snap, setSnap] = useState(true);

        const [source] = useState(() => new VectorSource());

        const [undoActions, setUndoActions] = useState<
            Map<number, (() => void)[]>
        >(() => new Map([]));
        const undoActionsRef = useRef(undoActions);
        useEffect(() => {
            undoActionsRef.current = undoActions;
        }, [undoActions]);

        const [editableItems, setEditableItems] = useState<LayerItemConfig[]>(
            []
        );
        const [itemsLoading, setItemsLoading] = useState<
            Map<number | undefined, boolean>
        >(() => new Map());

        const { webmapStore } = display;
        const { webmapItems } = webmapStore;

        const onChange = useCallback((val: string | null) => {
            setEditingMode(val as EditingState);
        }, []);

        const prevEditableRef = useRef<LayerItemConfig[]>(editableItems);
        useEffect(() => {
            const getKey = (i: LayerItemConfig) => i.id;
            const prev = prevEditableRef.current;

            const items: LayerItemConfig[] = [];
            for (const item of webmapItems) {
                if (item.type === "layer" && item.editable) {
                    items.push(item);
                }
            }

            const currKeys = new Set(items.map(getKey));
            const stopped = prev
                .filter((it) => !currKeys.has(getKey(it)))
                .filter((it) => undoActionsRef.current.has(getKey(it)));

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
                                webmapStore,
                                stopped.map((it) => it.id),
                                true
                            );
                        },
                    }
                );
            } else {
                proceed();
            }
        }, [source, display, modalStore, webmapItems, webmapStore, lazyModal]);

        const activeMode = useMemo(() => {
            return groupItem.isActive ? editingMode : null;
        }, [editingMode, groupItem.isActive]);

        const selectedInTreeItem = useMemo(() => {
            return display.item;
        }, [display.item]);

        const onUndoActionAdd = useCallback(
            (id: number, undoAction: () => void) => {
                setUndoActions((prev) => {
                    const next = new Map(prev);
                    const stack = next.get(id) ?? [];
                    next.set(id, [...stack, undoAction]);
                    return next;
                });
            },
            []
        );

        const currentUndoCount = useMemo(() => {
            const id = selectedInTreeItem?.id;
            return id !== null && id !== undefined
                ? (undoActions.get(id)?.length ?? 0)
                : 0;
        }, [undoActions, selectedInTreeItem]);

        const doUndo = useCallback(() => {
            setUndoActions((prev) => {
                const layerId = selectedInTreeItem?.id;
                if (layerId !== null && layerId !== undefined) {
                    const next = new Map(prev);
                    const stack = [...(next.get(layerId) ?? [])];
                    const undo = stack.pop();
                    if (undo) {
                        undo();
                    }
                    if (stack.length) next.set(layerId, stack);
                    else next.delete(layerId);
                    return next;
                }
                return prev;
            });
        }, [selectedInTreeItem?.id]);

        const dirty = useMemo(() => {
            for (const actions of undoActions.values()) {
                if (actions.length > 0) return true;
            }
            return false;
        }, [undoActions]);

        useEffectDebugger(() => {
            if (editingMode && editableItems.length) {
                const curentSelectedIsEditable =
                    selectedInTreeItem &&
                    editableItems.find((it) => selectedInTreeItem.id === it.id);
                if (curentSelectedIsEditable) {
                    groupItem.activate();
                    return;
                }
            }
            groupItem.deactivate();
        }, [
            editableItems,
            editableItems.length,
            editingMode,
            selectedInTreeItem,
        ]);

        useUnsavedChanges({ dirty });

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
                id="editor-toolbar"
            >
                {modalHolder}
                {editableItems.map(({ id, layerId }) => (
                    <EditableItem
                        key={id}
                        snap={snap}
                        source={source}
                        resourceId={layerId}
                        editingMode={
                            selectedInTreeItem?.id === id ? activeMode : null
                        }
                        onUndoActionAdd={(undo) => {
                            onUndoActionAdd(id, undo);
                        }}
                        onLoadingChange={(status) =>
                            setItemsLoading((prev) => {
                                const next = new Map(prev);
                                next.set(id, status);
                                return next;
                            })
                        }
                    />
                ))}
                {editableItems.find(
                    (item) => item.id === selectedInTreeItem?.id
                ) && (
                    <>
                        <ToggleGroup
                            onChange={onChange}
                            value={activeMode}
                            nonEmpty
                        >
                            {modes.map(([groupId, Icon, title], i) => (
                                <ToggleControl
                                    key={groupId}
                                    title={title}
                                    groupId={groupId}
                                    order={i}
                                >
                                    <Icon />
                                </ToggleControl>
                            ))}
                        </ToggleGroup>

                        <ToggleControl
                            title={(status) =>
                                status
                                    ? gettext("Disable snapping")
                                    : gettext("Enable snapping")
                            }
                            order={modes.length + 1}
                            value={snap}
                            onChange={setSnap}
                        >
                            <SnapIcon />
                        </ToggleControl>
                        <ButtonControl
                            title={
                                // prettier-ignore
                                gettext("Stop editing layer: {layer}")
                                .replace("{layer}", selectedInTreeItem?.label || "")
                            }
                            order={modes.length + 2}
                            onClick={() => {
                                if (selectedInTreeItem) {
                                    setItemsEditable(
                                        webmapStore,
                                        [selectedInTreeItem.id],
                                        false
                                    );
                                }
                            }}
                        >
                            <ExitIcon />
                        </ButtonControl>
                        {selectedInTreeItem &&
                            itemsLoading.get(selectedInTreeItem.id) && (
                                <ButtonControl
                                    order={modes.length + 3}
                                    disabled
                                >
                                    <Spin
                                        indicator={<LoadingOutlined spin />}
                                        size="small"
                                    />
                                </ButtonControl>
                            )}
                        {!!currentUndoCount && (
                            <ButtonControl
                                order={modes.length + 4}
                                onClick={doUndo}
                            >
                                <UndoIcon />
                            </ButtonControl>
                        )}
                    </>
                )}
            </MapToolbarControl>
        );
    }
);

ToolEditor.displayName = "ToolEditor";

export default ToolEditor;
