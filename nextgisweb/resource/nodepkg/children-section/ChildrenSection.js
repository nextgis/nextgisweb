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
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { useMemo, useState, useEffect } from "react";
import "./ChildrenSection.less";

const { Column } = Table;

function formatSize(volume) {
    if (volume === 0) {
        return "-";
    } else {
        var units = ["B", "KB", "MB", "GB", "TB"];
        var i = Math.min(
            Math.floor(Math.log(volume) / Math.log(1024)),
            units.length - 1
        );
        const value = volume / Math.pow(1024, i);
        return value.toFixed(0) + " " + units[i];
    }
}

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

function sorterFactory(attr) {
    return (a, b) => {
        const va = a[attr];
        const vb = b[attr];
        if (va == vb) return 0;
        if (va > vb) return 1;
        if (vb > va) return -1;
    };
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

export function ChildrenSection({ data, storageEnabled, ...props }) {
    const [volumeVisible, setVolumeVisible] = useState(false);
    const [batchDeletingInProgress, setBatchDeletingInProgress] =
        useState(false);
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

    useEffect(() => {
        setSelected((oldSelection) => {
            const itemsIds = items.map((item) => item.id);
            const updatedSelection = oldSelection.filter((selectedItem) =>
                itemsIds.includes(selectedItem)
            );
            return updatedSelection;
        });
    }, [items]);

    // TODO: make universal function with ModelBrowser.js
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
            const batchOperations = [];
            if (selected.length) {
                batchOperations.push(
                    ...[
                        {
                            label: (
                                <>
                                    {i18n.gettext("Delete")}{" "}
                                    {deleteAllowedSelected.length > 0 && <Badge
                                        size="small"
                                        count={deleteAllowedSelected.length}
                                    />}{" "}
                                    {deleteAllowedSelected.length <
                                        selected.length && deleteAllowedSelected.length > 0 && (
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
                        },
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
    }, [allowBatch, deleteAllowedSelected]);

    const MenuDropdown = () => {
        const menu = (
            <Menu>
                {menuItems.map(({ type, label, ...menuItemProps }, idx) => {
                    return type === "divider" ? (
                        <Menu.Divider key={idx}></Menu.Divider>
                    ) : (
                        <Menu.Item key={label} {...menuItemProps}>
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
