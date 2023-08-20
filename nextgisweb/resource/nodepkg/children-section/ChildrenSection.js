import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, Dropdown, message, Table, Tooltip } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { errorModal } from "@nextgisweb/gui/error";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { confirmDelete } from "@nextgisweb/gui/confirm";
import { sorterFactory } from "@nextgisweb/gui/util";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { showResourcePicker } from "../component/resource-picker";
import { createResourceTableItemOptions } from "./util/createResourceTableItemOptions";
import { forEachSelected } from "./util/forEachSelected";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert";
import PriorityHighIcon from "@nextgisweb/icon/material/priority_high";

import "./ChildrenSection.less";

const { Column } = Table;

function confirmThenDelete(onOk) {
    confirmDelete({
        onOk,
        content: gettext(
            "Please confirm resource deletion. This action cannot be undone."
        ),
    });
}

function notifySuccessfulDeletion(count) {
    message.success(
        count === 1 ? gettext("Resource deleted") : gettext("Resources deleted")
    );
}
function notifySuccessfulMove(count) {
    message.success(
        count === 1
            ? gettext("Resource has been moved")
            : gettext("Resources have been moved")
    );
}
function notifyMoveWithError(successItems, errorItems) {
    message.warning(
        `${gettext("Not all resources moved")} (${successItems.length}/${
            errorItems.length
        })`
    );
}
function notifyMoveAbsolutError(errorItems) {
    const count = errorItems.length;
    message.error(
        gettext(
            count === 1
                ? gettext("Failed to move resource")
                : gettext("Failed to move resources")
        )
    );
}

function isDeleteAction(action) {
    const { key } = action;
    return Array.isArray(key) && key[1] === "20-delete";
}

function renderActions(actions, id, setTableItems) {
    const deleteModelItem = () => {
        return route("resource.item", id)
            .delete()
            .then(() => {
                setTableItems((old) => old.filter((x) => x.id !== id));
                notifySuccessfulDeletion(1);
            })
            .catch((err) => {
                errorModal(err);
            });
    };

    return actions.map((action) => {
        const { target, href, icon, title } = action;

        const createActionBtn = (props_) => (
            <Tooltip key={title} title={title}>
                <SvgIconLink
                    {...props_}
                    icon={icon}
                    fill="currentColor"
                ></SvgIconLink>
            </Tooltip>
        );
        if (isDeleteAction(action)) {
            return createActionBtn({
                onClick: () => confirmThenDelete(deleteModelItem),
            });
        }
        return createActionBtn({ href, target });
    });
}

async function loadVolumes(data, setState) {
    setState({});
    for (const { id } of data) {
        const v = await route("resource.volume", id).get();
        setState((prevState) => {
            return { ...prevState, [id]: v.volume };
        });
    }
}

export function ChildrenSection({ data, storageEnabled, resourceId }) {
    const [volumeVisible, setVolumeVisible] = useState(false);
    const [creationDateVisible, setCreationDateVisible] = useState(false);
    const [batchDeletingInProgress, setBatchDeletingInProgress] =
        useState(false);

    const [allowBatch, setAllowBatch] = useState(false);
    const [volumeValues, setVolumeValues] = useState({});
    const [items, setItems] = useState([...data]);
    const [selected, setSelected] = useState([]);

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

    const rowSelection_ = useMemo(
        () => ({
            onChange: (selectedRowKeys) => {
                setSelected(selectedRowKeys);
            },
        }),
        []
    );

    const onNewGroup = useCallback(
        (newGroup) => {
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
        [resourceId]
    );

    useEffect(() => {
        setSelected((oldSelection) => {
            const itemsIds = items.map((item) => item.id);
            const updatedSelection = oldSelection.filter((selectedItem) =>
                itemsIds.includes(selectedItem)
            );
            return updatedSelection;
        });
    }, [items]);

    const moveSelectedTo = useCallback(
        (parentId) => {
            forEachSelected({
                title: gettext("Moving resources"),
                setItems,
                setSelected,
                selected,
                executer: ({ selectedItem, signal }) =>
                    route("resource.item", selectedItem).put({
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
        [selected]
    );

    const deleteSelected = useCallback(() => {
        forEachSelected({
            title: gettext("Deleting resources"),
            setItems,
            setSelected,
            setInProgress: setBatchDeletingInProgress,
            selected: selectedAllowedForDelete,
            executer: ({ selectedItem, signal }) =>
                route("resource.item", selectedItem).delete({ signal }),
            onComplate: (successItems) => {
                if (successItems.length) {
                    notifySuccessfulDeletion(successItems.length);
                }
            },
        });
    }, [selectedAllowedForDelete]);

    const rowSelection = useMemo(() => {
        return (
            allowBatch && {
                type: "checkbox",
                getCheckboxProps: () => ({
                    disabled: batchDeletingInProgress,
                }),
                selectedRowKeys: selected,
                ...rowSelection_,
            }
        );
    }, [allowBatch, selected, batchDeletingInProgress, rowSelection_]);

    const menuItems = useMemo(() => {
        const menuItems_ = [];
        menuItems_.push({
            label: allowBatch
                ? gettext("Turn off multiple selection")
                : gettext("Select multiple resources"),
            onClick: () => {
                setAllowBatch(!allowBatch);
            },
        });

        if (storageEnabled) {
            menuItems_.push({
                label: volumeVisible
                    ? gettext("Hide resources volume")
                    : gettext("Show resources volume"),
                onClick: () => {
                    setVolumeVisible(!volumeVisible);
                    !volumeVisible && loadVolumes(data, setVolumeValues);
                },
            });
        }
        menuItems_.push({
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
            const deleteOperationConfig = {
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
            const moveOperationConfig = {
                label: <>{gettext("Move")}</>,
                onClick: () => {
                    const resourcePicker = showResourcePicker({
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
            const exportFeaturesOperationConfig = {
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

            const batchOperations = [];
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
        data,
        selected,
        allowBatch,
        resourceId,
        onNewGroup,
        volumeVisible,
        moveSelectedTo,
        deleteSelected,
        storageEnabled,
        creationDateVisible,
        selectedAllowedForDelete,
        selectedAllowedForFeatureExport,
    ]);

    const MenuDropdown = () => {
        return (
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                <a>
                    <MoreVertIcon />
                </a>
            </Dropdown>
        );
    };

    return (
        <div className="ngw-resource-children-section">
            <Table
                dataSource={items}
                rowKey="id"
                size="middle"
                rowSelection={rowSelection}
            >
                <Column
                    title={gettext("Display name")}
                    className="displayName"
                    dataIndex="displayName"
                    sorter={sorterFactory("displayName")}
                    render={(value, record) => (
                        <SvgIconLink
                            href={record.link}
                            icon={`rescls-${record.cls}`}
                        >
                            {value}
                        </SvgIconLink>
                    )}
                />
                <Column
                    title={gettext("Type")}
                    responsive={["md"]}
                    className="cls"
                    dataIndex="clsDisplayName"
                    sorter={sorterFactory("clsDisplayName")}
                />
                <Column
                    title={gettext("Owner")}
                    responsive={["xl"]}
                    className="ownerUser"
                    dataIndex="ownerUserDisplayName"
                    sorter={sorterFactory("ownerUserDisplayName")}
                />
                {creationDateVisible && (
                    <Column
                        title={gettext("Created")}
                        responsive={["xl"]}
                        className="creationDate"
                        dataIndex="creationDate"
                        sorter={sorterFactory("creationDate")}
                        render={(text) => {
                            if (text && !text.startsWith("1970")) {
                                return (
                                    <div style={{ whiteSpace: "nowrap" }}>
                                        {utc(text).local().format("L LTS")}
                                    </div>
                                );
                            }
                            return "";
                        }}
                    />
                )}
                {storageEnabled && volumeVisible && (
                    <Column
                        title={gettext("Volume")}
                        className="volume"
                        sorter={(a, b) =>
                            volumeValues[a.id] - volumeValues[b.id]
                        }
                        render={(_, record) => {
                            if (volumeValues[record.id] !== undefined) {
                                return formatSize(volumeValues[record.id]);
                            } else {
                                return "";
                            }
                        }}
                    />
                )}
                <Column
                    title={menuItems.length && <MenuDropdown />}
                    className="actions"
                    dataIndex="actions"
                    render={(actions, record) =>
                        renderActions(actions, record.id, setItems)
                    }
                />
            </Table>
        </div>
    );
}
