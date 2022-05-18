import MoreVertIcon from "@material-icons/svg/more_vert";
import {
    Badge,
    Dropdown,
    Menu,
    message,
    Modal,
    Popconfirm,
    Table,
    Tooltip,
} from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { useMemo, useState } from "react";
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

const deleteSuccess = i18n.gettext("Resource deleted");
const deleteBatchSuccess = i18n.gettext("Resources deleted");

function renderActions(actions, id, setTableItems) {
    const deleteModelItem = () => {
        return route("resource.item", id)
            .delete()
            .then(() => {
                setTableItems((old) => old.filter((x) => x.id !== id));
                message.success(deleteSuccess);
            })
            .catch((err) => {
                errorModal(err);
            });
    };

    const onDeleteClick = () => {
        Modal.confirm({
            title: i18n.gettext("Delete resource"),
            content: i18n.gettext("Confirm deletion of the resource"),
            onOk() {
                return deleteModelItem();
            },
            autoFocusButton: "cancel",
        });
    };

    return actions.map((action) => {
        const { key, target, href, icon, title } = action;

        const createActionBtn = (props_) => (
            <Tooltip key={title} title={title}>
                <a {...props_}>
                    <svg className="icon" fill="currentColor">
                        <use xlinkHref={`#icon-${icon}`} />
                    </svg>
                </a>
            </Tooltip>
        );
        if (Array.isArray(key) && key[1] === "20-delete") {
            return createActionBtn({ onClick: onDeleteClick });
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

    const menuItems = [];

    const rowSelection_ = {
        onChange: (selectedRowKeys) => {
            setSelected(selectedRowKeys);
        },
    };

    // TODO: make universal function with ModelBrowser.js
    const deleteSelected = async () => {
        setBatchDeletingInProgress(true);
        try {
            const deleted = [];
            const deleteError = [];
            for (const s of selected) {
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
            }
            setSelected([]);
            setItems((old) => old.filter((row) => !deleted.includes(row.id)));
            message.success(deleteBatchSuccess);
        } catch (err) {
            errorModal(err);
        } finally {
            setBatchDeletingInProgress(false);
        }
    };

    const onDeleteSelectedClick = () => {
        Modal.confirm({
            content: i18n.gettext("Confirm deletion of the resource."),
            title: i18n.gettext("Delete resources"),
            onOk() {
                return deleteSelected();
            },
            autoFocusButton: "cancel",
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

    menuItems.push({
        label: allowBatch
            ? i18n.gettext("Turn off multiple selection")
            : i18n.gettext("Select multiple resources"),
        onClick: () => {
            setAllowBatch(!allowBatch);
        },
    });

    if (storageEnabled) {
        menuItems.push({
            label: volumeVisible
                ? i18n.gettext("Hide resources volume")
                : i18n.gettext("Show resources volume"),
            onClick: () => {
                setVolumeVisible(!volumeVisible);
                !volumeVisible && loadVolumes(data, setVolumeValues);
            },
        });
    }
    if (allowBatch && selected.length) {
        menuItems.push(
            ...[
                {
                    type: "divider",
                },
                {
                    label: (
                        <>
                            <Badge
                                count={selected.length}
                                size="small"
                                offset={[10, 0]}
                            >
                                {i18n.gettext("Delete")}
                            </Badge>
                        </>
                    ),
                    onClick: onDeleteSelectedClick,
                },
            ]
        );
    }

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
