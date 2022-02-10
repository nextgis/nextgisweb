import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";
import { CloseOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import ErrorDialog from "ngw-pyramid/ErrorDialog/ErrorDialog";
import {
    Button,
    message,
    Popconfirm,
    Table,
    Tooltip,
} from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!";

export function ModelBrowse({
    columns,
    model,
    messages,
    collectionOptions,
    collectionFilter,
    ...tableProps
}) {
    messages = messages || {};
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const deleteConfirm =
        messages.deleteConfirm || i18n.gettext("Confirmation");
    const deleteSuccess =
        messages.deleteSuccess || i18n.gettext("Item deleted");

    const onEditClick = (id) => {
        const url = routeURL(model + ".edit", id);
        window.open(url, "_self");
    };

    const deleteModelItem = async (id) => {
        try {
            await route(model + ".item", id).delete();
            const newRows = rows.filter((row) => row.id !== id);
            setRows(newRows);
            message.success(deleteSuccess);
        } catch (err) {
            new ErrorDialog(err).show();
        }
    };

    const goToCreatePage = () => {
        const url = routeURL(model + ".create");
        window.open(url, "_self");
    };

    const columns_ = [
        ...columns,
        {
            title: () => (
                <Tooltip title={i18n.gettext("Create")}>
                    <Button
                        icon={<PlusOutlined />}
                        type="primary"
                        shape="circle"
                        onClick={goToCreatePage}
                    />
                </Tooltip>
            ),
            key: "action",
            width: "0px",
            align: "right",
            render: (text, record) => (
                <div style={{ whiteSpace: "nowrap" }}>
                    <Tooltip title={i18n.gettext("Edit")}>
                        <Button
                            type="text"
                            shape="circle"
                            icon={<EditOutlined />}
                            onClick={() => onEditClick(record.id)}
                        />
                    </Tooltip>
                    <Tooltip title={i18n.gettext("Delete")}>
                        <Popconfirm
                            placement="bottom"
                            title={deleteConfirm}
                            onConfirm={() => deleteModelItem(record.id)}
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CloseOutlined />}
                            />
                        </Popconfirm>
                    </Tooltip>
                </div>
            ),
        },
    ];

    useEffect(async () => {
        const resp = await route(model + ".collection").get(collectionOptions);
        const data = resp.filter(collectionFilter || (() => true));
        setRows(data.map((x) => ({ ...x, key: x.keyname })));
        setLoading(false);
    }, []);

    return (
        <Table
            loading={loading}
            columns={columns_}
            dataSource={rows}
            pagination={false}
            size="middle"
            {...tableProps}
        />
    );
}

ModelBrowse.propTypes = {
    model: PropTypes.string.isRequired,
    columns: PropTypes.array.isRequired,
    messages: PropTypes.object,
};
