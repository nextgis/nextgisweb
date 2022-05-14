import MoreVertIcon from "@material-icons/svg/more_vert";
import {
    Dropdown,
    Menu,
    Popconfirm,
    Table,
    Tooltip,
    message,
} from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { errorModal } from "@nextgisweb/gui/error";
import { useState } from "react";
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

const deleteConfirm = i18n.gettext("Confirmation");
const deleteSuccess = i18n.gettext("Resource deleted");

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

    return actions.map((action, idx) => {
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
            return (
                <Popconfirm
                    key={title}
                    placement="bottom"
                    title={deleteConfirm}
                    onConfirm={() => deleteModelItem()}
                >
                    {createActionBtn()}
                </Popconfirm>
            );
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
    const [volumeValues, setVolumeValues] = useState({});
    const [items, setItems] = useState([...data]);

    return (
        <div className="ngw-resource-children-section">
            <Table
                dataSource={items}
                rowKey="id"
                pagination={false}
                size="middle"
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
                    title={
                        storageEnabled && (
                            <Dropdown
                                overlay={
                                    <Menu
                                        items={[
                                            {
                                                label: !volumeVisible
                                                    ? i18n.gettext(
                                                          "Show resources volume"
                                                      )
                                                    : i18n.gettext(
                                                          "Hide resources volume"
                                                      ),
                                                onClick: () => {
                                                    setVolumeVisible(
                                                        !volumeVisible
                                                    );
                                                    !volumeVisible &&
                                                        loadVolumes(
                                                            data,
                                                            setVolumeValues
                                                        );
                                                },
                                            },
                                        ]}
                                    />
                                }
                                trigger={["click"]}
                            >
                                <a>
                                    <MoreVertIcon />
                                </a>
                            </Dropdown>
                        )
                    }
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
