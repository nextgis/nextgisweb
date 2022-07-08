import MoreVertIcon from "@material-icons/svg/more_vert";
import PriorityHighIcon from "@material-icons/svg/priority_high";
import {
    Badge,
    Dropdown,
    Menu,
    message,
    Modal,
    Table,
    Tooltip,
} from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";

import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { sorterFactory } from "@nextgisweb/gui/util/sortedFactory";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { useEffect, useMemo, useState } from "react";
import { showResourcePicker } from "../resource-picker";
import { createResourceTableItemOptions } from "../resource-picker/util/createResourceTableItemOptions";
import "./ChildrenSection.less";
import { forEachSelected } from "./util/forEachSelected";

const { Column } = Table;

function confirmThenDelete(callback) {
    Modal.confirm({
        onOk: callback,
        title: i18n.gettext("Confirmation required"),
        content: i18n.gettext(
            "Please confirm resource deletion. This action cannot be undone."
        ),
        okButtonProps: { danger: true, type: "primary" },
        okText: i18n.gettext("Delete"),
        autoFocusButton: "cancel",
    });
}

function notifySuccessfulDeletion(count) {
    message.success(
        count == 1
            ? i18n.gettext("Resource deleted")
            : i18n.gettext("Resources deleted")
    );
}
function notifySuccessfulMove(count) {
    message.success(
        count == 1
            ? i18n.gettext("Resource has been moved")
            : i18n.gettext("Resources have been moved")
    );
}
function notifyMoveWithError(successItems, errorItems) {
    message.warning(
        `${i18n.gettext("Not all resources moved")} (${successItems.length}/${
            errorItems.length
        })`
    );
}
function notifyMoveAbsolutError(errorItems) {
    const count = errorItems.length;
    message.error(
        i18n.gettext(
            count == 1
                ? i18n.gettext("Failed to move resource")
                : i18n.gettext("Failed to move resources")
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
                <a {...props_}>
                    <svg className="icon" fill="currentColor">
                        <use xlinkHref={`#icon-${icon}`} />
                    </svg>
                </a>
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
    const [batchDeletingInProgress, setBatchDeletingInProgress] =
        useState(false);
    const [batchMoveInProgress, setBatchMoveInProgress] = useState(false);
    const [allowBatch, setAllowBatch] = useState(false);
    const [volumeValues, setVolumeValues] = useState({});
    const [items, setItems] = useState([...data]);
    const [selected, setSelected] = useState([]);

    const selectedAllowefForDelete = useMemo(() => {
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

    const rowSelection_ = {
        onChange: (selectedRowKeys) => {
            setSelected(selectedRowKeys);
        },
    };

    const onNewGroup = (newGroup) => {
        if (newGroup) {
            if (newGroup.parent.id === resourceId)
                setItems((old) => {
                    const newItem = createResourceTableItemOptions(newGroup);
                    return [...old, newItem];
                });
        }
    };

    useEffect(() => {
        setSelected((oldSelection) => {
            const itemsIds = items.map((item) => item.id);
            const updatedSelection = oldSelection.filter((selectedItem) =>
                itemsIds.includes(selectedItem)
            );
            return updatedSelection;
        });
    }, [items]);

    const moveSelectedTo = (parentId) => {
        forEachSelected({
            title: i18n.gettext("Moving resources"),
            setItems,
            setSelected,
            setInProgress: setBatchMoveInProgress,
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
    };

    const deleteSelected = () => {
        forEachSelected({
            title: i18n.gettext("Deleting resources"),
            setItems,
            setSelected,
            setInProgress: setBatchDeletingInProgress,
            selected: selectedAllowefForDelete,
            executer: ({ selectedItem, signal }) =>
                route("resource.item", selectedItem).delete({ signal }),
            onComplate: (successItems, errorItems) => {
                if (successItems.length) {
                    notifySuccessfulDeletion(successItems.length);
                }
            },
        });
    };

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
    }, [allowBatch, selected, batchDeletingInProgress]);

    const menuItems = useMemo(() => {
        const menuItems_ = [];
        menuItems_.push({
            label: allowBatch
                ? i18n.gettext("Turn off multiple selection")
                : i18n.gettext("Select multiple resources"),
            onClick: () => {
                setAllowBatch(!allowBatch);
            },
        });

        if (storageEnabled) {
            menuItems_.push({
                label: volumeVisible
                    ? i18n.gettext("Hide resources volume")
                    : i18n.gettext("Show resources volume"),
                onClick: () => {
                    setVolumeVisible(!volumeVisible);
                    !volumeVisible && loadVolumes(data, setVolumeValues);
                },
            });
        }
        if (allowBatch) {
            // Batch delete
            const checkNotAllForDelete =
                selectedAllowefForDelete.length < selected.length &&
                selectedAllowefForDelete.length > 0;
            const deleteOperationConfig = {
                label: (
                    <>
                        {i18n.gettext("Delete")}{" "}
                        {selectedAllowefForDelete.length > 0 && (
                            <Badge
                                size="small"
                                count={selectedAllowefForDelete.length}
                            />
                        )}{" "}
                        {checkNotAllForDelete && (
                            <Tooltip
                                title={i18n.gettext(
                                    "Not all of the selected can be deleted."
                                )}
                            >
                                <PriorityHighIcon />
                            </Tooltip>
                        )}
                    </>
                ),
                disabled: !selectedAllowefForDelete.length,
                onClick: () => confirmThenDelete(deleteSelected),
            };

            // Batch change parent
            const moveOperationConfig = {
                label: <>{i18n.gettext("Move")}</>,
                onClick: () => {
                    const resourcePicker = showResourcePicker({
                        resourceId,
                        disabledIds: [...selected, resourceId],
                        onNewGroup,
                        onSelect: (newParentId) => {
                            moveSelectedTo(newParentId);
                            resourcePicker.close();
                        },
                    });
                },
            };

            const batchOperations = [];
            if (selected.length) {
                batchOperations.push(
                    ...[deleteOperationConfig, moveOperationConfig]
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
    }, [allowBatch, selectedAllowefForDelete]);

    const MenuDropdown = () => {
        const menu = <Menu items={menuItems} />;
        return (
            <Dropdown overlay={menu} trigger={["click"]}>
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
                pagination={false}
                size="middle"
                rowSelection={rowSelection}
            >
                <Column
                    title={i18n.gettext("Display name")}
                    className="displayName"
                    dataIndex="displayName"
                    sorter={sorterFactory("displayName")}
                    render={(value, record) => (
                        <a href={record.link}>
                            <svg className="icon">
                                <use xlinkHref={`#icon-rescls-${record.cls}`} />
                            </svg>
                            {value}
                        </a>
                    )}
                />
                <Column
                    title={i18n.gettext("Type")}
                    responsive={["md"]}
                    className="cls"
                    dataIndex="clsDisplayName"
                    sorter={sorterFactory("clsDisplayName")}
                />
                <Column
                    title={i18n.gettext("Owner")}
                    responsive={["xl"]}
                    className="ownerUser"
                    dataIndex="ownerUserDisplayName"
                    sorter={sorterFactory("ownerUserDisplayName")}
                />
                {storageEnabled && volumeVisible && (
                    <Column
                        title={i18n.gettext("Volume")}
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
