import { useCallback, useMemo } from "react";

import { Badge, Dropdown, Tooltip } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { showResourcePicker } from "../../component/resource-picker";
import type { ResourceItem } from "../../type";
import type { ChildrenResource } from "../type";
import { createResourceTableItemOptions } from "../util/createResourceTableItemOptions";
import { forEachSelected } from "../util/forEachSelected";
import { isDeleteAction } from "../util/isDeleteAction";
import { loadVolumes } from "../util/loadVoluems";
import {
    confirmThenDelete,
    notifyMoveAbsolutError,
    notifyMoveWithError,
    notifySuccessfulDeletion,
    notifySuccessfulMove,
} from "../util/notify";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert";
import PriorityHighIcon from "@nextgisweb/icon/material/priority_high";

interface MenuDropdownProps {
    data: ChildrenResource[];
    items: ChildrenResource[];
    selected: number[];
    allowBatch: boolean;
    resourceId: number;
    volumeVisible: boolean;
    storageEnabled: boolean;
    creationDateVisible: boolean;
    setBatchDeletingInProgress: React.Dispatch<React.SetStateAction<boolean>>;
    setCreationDateVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setVolumeVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setVolumeValues: React.Dispatch<
        React.SetStateAction<Record<number, number>>
    >;
    setAllowBatch: React.Dispatch<React.SetStateAction<boolean>>;
    setSelected: React.Dispatch<React.SetStateAction<number[]>>;
    setItems: React.Dispatch<React.SetStateAction<ChildrenResource[]>>;
}

type MenuItems = NonNullable<MenuProps["items"]>;
type MenuItem = MenuItems[0];

export function MenuDropdown({
    data,
    items,
    selected,
    allowBatch,
    resourceId,
    volumeVisible,
    storageEnabled,
    creationDateVisible,
    setBatchDeletingInProgress,
    setCreationDateVisible,
    setVolumeVisible,
    setVolumeValues,
    setAllowBatch,
    setSelected,
    setItems,
}: MenuDropdownProps) {
    const selectedAllowedForFeatureExport = useMemo(() => {
        const allowedToFeatureExport = [];

        for (const item of items) {
            if (selected.includes(item.id)) {
                if (item.cls === "vector_layer") {
                    allowedToFeatureExport.push(item.id);
                }
            }
        }
        return allowedToFeatureExport;
    }, [selected, items]);

    const onNewGroup = useCallback(
        (newGroup: ResourceItem) => {
            if (newGroup) {
                if (newGroup.resource.parent.id === resourceId)
                    setItems((old) => {
                        const newItem = createResourceTableItemOptions(
                            newGroup.resource
                        );
                        return [...old, newItem];
                    });
            }
        },
        [resourceId, setItems]
    );

    const moveSelectedTo = useCallback(
        (parentId: number) => {
            forEachSelected({
                title: gettext("Moving resources"),
                setItems,
                setSelected,
                selected,
                executer: ({ selectedId, signal }) =>
                    route("resource.item", selectedId).put({
                        signal,
                        json: {
                            resource: {
                                parent: { id: parentId },
                            },
                        },
                    }),
                onComplate: (successItems, errorItems) => {
                    if (successItems.length) {
                        if (errorItems.length) {
                            notifyMoveWithError(successItems, errorItems);
                        } else {
                            notifySuccessfulMove(successItems.length);
                        }
                    } else if (errorItems) {
                        notifyMoveAbsolutError(errorItems);
                    }
                },
            });
        },
        [selected, setItems, setSelected]
    );

    const selectedAllowedForDelete = useMemo(() => {
        const allowedToDelete = [];

        for (const item of items) {
            if (selected.includes(item.id)) {
                const includeDelAction =
                    item.actions && item.actions.some(isDeleteAction);
                if (includeDelAction) {
                    allowedToDelete.push(item.id);
                }
            }
        }
        return allowedToDelete;
    }, [selected, items]);

    const deleteSelected = useCallback(() => {
        forEachSelected({
            title: gettext("Deleting resources"),
            setItems,
            setSelected,
            setInProgress: setBatchDeletingInProgress,
            selected: selectedAllowedForDelete,
            executer: ({ selectedId, signal }) =>
                route("resource.item", selectedId).delete({ signal }),
            onComplate: (successItems) => {
                if (successItems.length) {
                    notifySuccessfulDeletion(successItems.length);
                }
            },
        });
    }, [
        selectedAllowedForDelete,
        setBatchDeletingInProgress,
        setItems,
        setSelected,
    ]);

    const menuItems = useMemo(() => {
        const menuItems_: MenuItems = [];
        menuItems_.push({
            key: "multiple_selection",
            label: allowBatch
                ? gettext("Turn off multiple selection")
                : gettext("Select multiple resources"),
            onClick: () => {
                setAllowBatch(!allowBatch);
            },
        });

        if (storageEnabled) {
            menuItems_.push({
                key: "volumes",
                label: volumeVisible
                    ? gettext("Hide resources volume")
                    : gettext("Show resources volume"),
                onClick: () => {
                    setVolumeVisible(!volumeVisible);
                    !volumeVisible &&
                        loadVolumes({ data, setState: setVolumeValues });
                },
            });
        }
        menuItems_.push({
            key: "creation_dates",
            label: creationDateVisible
                ? gettext("Hide resource creation date")
                : gettext("Show resource creation date"),
            onClick: () => {
                setCreationDateVisible(!creationDateVisible);
            },
        });
        if (allowBatch) {
            // Batch delete
            const checkNotAllForDelete =
                selectedAllowedForDelete.length < selected.length &&
                selectedAllowedForDelete.length > 0;
            const deleteOperationConfig: MenuItem = {
                key: "delete",
                label: (
                    <>
                        {gettext("Delete")}{" "}
                        {selectedAllowedForDelete.length > 0 && (
                            <Badge
                                size="small"
                                count={selectedAllowedForDelete.length}
                            />
                        )}{" "}
                        {checkNotAllForDelete && (
                            <Tooltip
                                title={gettext(
                                    "Not all of the selected can be deleted."
                                )}
                            >
                                <PriorityHighIcon />
                            </Tooltip>
                        )}
                    </>
                ),
                disabled: !selectedAllowedForDelete.length,
                onClick: () => confirmThenDelete(deleteSelected),
            };

            // Batch change parent
            const moveOperationConfig: MenuItem = {
                key: "move",
                label: <>{gettext("Move")}</>,
                onClick: () => {
                    const resourcePicker = showResourcePicker<number>({
                        pickerOptions: {
                            parentId: resourceId,
                            traverseClasses: ["resource_group"],
                            hideUnavailable: true,
                            disableResourceIds: [...selected, resourceId],
                            onNewGroup,
                        },
                        onSelect: (newParentId) => {
                            moveSelectedTo(newParentId);
                            resourcePicker.close();
                        },
                    });
                },
            };
            const exportFeaturesOperationConfig: MenuItem = {
                key: "export",
                label: <>{gettext("Export vector layers")}</>,
                disabled: !selectedAllowedForFeatureExport.length,
                onClick: () => {
                    window.open(
                        `${routeURL(
                            "feature_layer.export_multiple"
                        )}?resources=${selectedAllowedForFeatureExport.join(
                            ","
                        )}`
                    );
                },
            };

            const batchOperations: MenuItems = [];
            if (selected.length) {
                batchOperations.push(
                    ...[
                        deleteOperationConfig,
                        moveOperationConfig,
                        exportFeaturesOperationConfig,
                    ]
                );
            }
            if (batchOperations.length) {
                batchOperations.unshift({
                    type: "divider",
                });
            }
            menuItems_.push(...batchOperations);
        }
        return menuItems_;
    }, [
        selectedAllowedForFeatureExport,
        selectedAllowedForDelete,
        creationDateVisible,
        storageEnabled,
        volumeVisible,
        allowBatch,
        resourceId,
        selected,
        data,
        onNewGroup,
        setAllowBatch,
        deleteSelected,
        moveSelectedTo,
        setVolumeValues,
        setVolumeVisible,
        setCreationDateVisible,
    ]);

    if (!menuItems.length) {
        return null;
    }

    return (
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <a>
                <MoreVertIcon />
            </a>
        </Dropdown>
    );
}
