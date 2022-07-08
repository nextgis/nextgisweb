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
    Progress,
} from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import showModal from "@nextgisweb/gui/showModal";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { sorterFactory } from "@nextgisweb/gui/util/sortedFactory";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { useEffect, useMemo, useState } from "react";
import { showResourcePicker } from "../resource-picker";
import { createResourceTableItemOptions } from "../util/createResourceTableItemOptions";
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

    const deleteAllowedSelected = useMemo(() => {
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
    }, [selected]);

    const rowSelection_ = {
        onChange: (selectedRowKeys) => {
            setSelected(selectedRowKeys);
        },
    };

    const onNewFolder = (newFolder) => {
        if (newFolder) {
            if (newFolder.parent.id === resourceId)
                setItems((old) => {
                    return [...old, createResourceTableItemOptions(newFolder)];
                });
        }
    };

    // WIP for batch reource moving
    // useEffect(() => {
    //     const modalOptions = {
    //         status: "active",
    //         type: "line",
    //         percent: 0,
    //         visible: true,
    //         closable: false,
    //         footer: null,
    //         title: "Resource moving in progress",
    //     };
    //     const ProgressModal = ({ visible, closable,footer, title,...progressProps }) => {
    //         return (
    //             <Modal {...{ visible, closable, footer, title }}>
    //                 <Progress {...progressProps} />
    //             </Modal>
    //         );
    //     };
    //     const movingProgressModal = showModal(ProgressModal, {
    //         ...modalOptions,
    //         progress: 0,
    //     });

    //     const updateProgress = async () => {
    //         for (const a of Array.from(Array(100), (_, i) => i + 1)) {
    //             await new Promise((res) => {
    //                 setTimeout(res, 500);
    //             });
    //             movingProgressModal.update({ ...modalOptions, percent: a });
    //         }
    //     };
    //     updateProgress();

    //     return () => {
    //         // abort all requests
    //     };
    // }, []);

    useEffect(() => {
        setSelected((oldSelection) => {
            const itemsIds = items.map((item) => item.id);
            const updatedSelection = oldSelection.filter((selectedItem) =>
                itemsIds.includes(selectedItem)
            );
            return updatedSelection;
        });
    }, [items]);

    const moveSelectedTo = async (parentId) => {
        setBatchMoveInProgress(true);

        try {
            const moved = [];
            const moveError = [];
            for (const s of selected) {
                try {
                    await route("resource.item", s).put({
                        json: {
                            resource: {
                                parent: { id: parentId },
                            },
                        },
                    });
                    moved.push(s);
                } catch {
                    moveError.push(s);
                }
            }
            if (moveError.length) {
                errorModal({
                    tittle: i18n.gettext(
                        "The errors occurred during execution"
                    ),
                    detail: `${i18n.gettext(
                        "Failed to move items:"
                    )} ${moveError.join(", ")}`,
                });
            } else {
                notifySuccessfulMove(moved.length);
            }
            const removeMoved = (old) =>
                old.filter((row) => !moved.includes(row.id));

            setSelected(removeMoved);
            setItems(removeMoved);
        } catch (err) {
            errorModal(err);
        } finally {
            setBatchMoveInProgress(false);
        }
    };

    const deleteSelected = async () => {
        setBatchDeletingInProgress(true);
        try {
            const deleted = [];
            const deleteError = [];
            for (const s of deleteAllowedSelected) {
                try {
                    await route("resource.item", s).delete();
                    deleted.push(s);
                } catch {
                    deleteError.push(s);
                }
            }
            if (deleteError.length) {
                errorModal({
                    tittle: i18n.gettext(
                        "The errors occurred during execution"
                    ),
                    detail: `${i18n.gettext(
                        "Failed to delete items:"
                    )} ${deleteError.join(", ")}`,
                });
            } else {
                notifySuccessfulDeletion(deleted.length);
            }
            const removeDeleted = (old) =>
                old.filter((row) => !deleted.includes(row.id));

            setSelected(removeDeleted);
            setItems(removeDeleted);
        } catch (err) {
            errorModal(err);
        } finally {
            setBatchDeletingInProgress(false);
        }
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
                deleteAllowedSelected.length < selected.length &&
                deleteAllowedSelected.length > 0;
            const deleteOperationConfig = {
                label: (
                    <>
                        {i18n.gettext("Delete")}{" "}
                        {deleteAllowedSelected.length > 0 && (
                            <Badge
                                size="small"
                                count={deleteAllowedSelected.length}
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
                disabled: !deleteAllowedSelected.length,
                onClick: () => confirmThenDelete(deleteSelected),
            };

            // Batch change parent
            const changeParentOperationConfig = {
                label: <>{i18n.gettext("Change parent")}</>,
                onClick: () =>
                    showResourcePicker({
                        resourceId,
                        disabledIds: selected,
                        onNewFolder,
                        onSelect: moveSelectedTo,
                    }),
            };

            const batchOperations = [];
            if (selected.length) {
                batchOperations.push(
                    ...[deleteOperationConfig, changeParentOperationConfig]
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
    }, [allowBatch, deleteAllowedSelected]);

    const MenuDropdown = () => {
        const menu = (
            <Menu>
                {menuItems.map(({ type, label, ...menuItemProps }, idx) => {
                    return type === "divider" ? (
                        <Menu.Divider key={idx}></Menu.Divider>
                    ) : (
                        <Menu.Item key={idx} {...menuItemProps}>
                            {label}
                        </Menu.Item>
                    );
                })}
            </Menu>
        );
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
