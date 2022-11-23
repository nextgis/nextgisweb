import MoreVertIcon from "@material-icons/svg/more_vert";
import PriorityHighIcon from "@material-icons/svg/priority_high";
import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    Badge,
    Dropdown,
    message,
    Modal,
    Table,
    Tooltip,
} from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { errorModal } from "@nextgisweb/gui/error";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { sorterFactory } from "@nextgisweb/gui/util/sortedFactory";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!resource";

import { showResourcePicker } from "../resource-picker";
import { createResourceTableItemOptions } from "../resource-picker/util/createResourceTableItemOptions";
import { forEachSelected } from "./util/forEachSelected";

import "./ChildrenSection.less";

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
                if (newGroup.parent.id === resourceId)
                    setItems((old) => {
                        const newItem =
                            createResourceTableItemOptions(newGroup);
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
                title: i18n.gettext("Moving resources"),
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
            title: i18n.gettext("Deleting resources"),
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
        menuItems_.push({
            label: creationDateVisible
                ? i18n.gettext("Hide resource creation date")
                : i18n.gettext("Show resource creation date"),
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
                        {i18n.gettext("Delete")}{" "}
                        {selectedAllowedForDelete.length > 0 && (
                            <Badge
                                size="small"
                                count={selectedAllowedForDelete.length}
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
                disabled: !selectedAllowedForDelete.length,
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
                        <SvgIconLink
                            href={record.link}
                            icon={`rescls-${record.cls}`}
                        >
                            {value}
                        </SvgIconLink>
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
                {creationDateVisible && (
                    <Column
                        title={i18n.gettext("Created")}
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

ChildrenSection.propTypes = {
    data: PropTypes.arrayOf(PropTypes.object),
    resourceId: PropTypes.number,
    storageEnabled: PropTypes.bool,
};
