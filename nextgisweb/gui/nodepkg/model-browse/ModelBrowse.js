import AddCircleIcon from "@material-icons/svg/add_circle";
import DeleteForeverIcon from "@material-icons/svg/delete_forever";
import EditIcon from "@material-icons/svg/edit";
import SearchIcon from "@material-icons/svg/search";
import {
    Badge,
    Button,
    Col,
    Input,
    message,
    Modal,
    Popconfirm,
    Row,
    Space,
    Table,
    Tooltip,
} from "@nextgisweb/gui/antd";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!gui";
import { errorModal } from "@nextgisweb/gui/error";
import { PropTypes } from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import "./ModelBrowse.less";

export function ModelBrowse({
    columns,
    model: m,
    messages,
    itemProps = {},
    createProps = {},
    callbacks = {},
    selectedControls = [],
    headerControls = [],
    collectionOptions,
    collectionFilter,
    ...tableProps
}) {
    const model =
        typeof m === "string"
            ? {
                  item: m + ".item",
                  collection: m + ".collection",
                  edit: m + ".edit",
                  browse: m + ".browse",
                  create: m + ".create",
              }
            : m;

    const msg = messages || {};
    const deleteConfirm = msg.deleteConfirm || i18n.gettext("Confirmation");
    const deleteSuccess = msg.deleteSuccess || i18n.gettext("Item deleted");
    const deleteBatchSuccess =
        msg.deleteBatchSuccess || i18n.gettext("Items deleted");

    const [rows, setRows] = useState([]);
    const [status, setStatus] = useState("loading");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState([]);

    useEffect(async () => {
        const resp = await route(model.collection).get(collectionOptions);
        const data = resp.filter(collectionFilter || (() => true));
        setRows(data);
        setStatus(null);
    }, []);

    const filteredRows = useMemo(() => {
        if (search) {
            return [...rows].filter((row) => {
                for (const val of Object.values(row)) {
                    if (
                        String(val).toLowerCase().includes(search.toLowerCase())
                    ) {
                        return true;
                    }
                }
                return false;
            });
        }
        return rows;
    }, [rows, search]);

    const onEditClick = (id) => {
        const url = routeURL(model.edit, id);
        window.open(url, "_self");
    };

    const deleteModelItem = async (id) => {
        try {
            await route(model.item, id).delete();
            const newRows = rows.filter((row) => row.id !== id);
            setRows(newRows);
            message.success(deleteSuccess);
            if (callbacks && callbacks.deleteModelItem) {
                callbacks.deleteModelItem();
            }
        } catch (err) {
            errorModal(err);
        }
    };

    const deleteSelected = async () => {
        setStatus("deleting");
        try {
            const deleted = [];
            const deleteError = [];
            for (const s of selected) {
                try {
                    await route(model.item, s).delete();
                    deleted.push(s);
                } catch {
                    deleteError.push(s);
                }
            }
            if (deleteError.length) {
                Modal.confirm({
                    type: "error",
                    title: i18n.gettext("The errors occurred during execution"),
                    content: (
                        <>
                            <p>
                                {i18n.gettext("Failed to delete items:")}{" "}
                                {deleteError.join(", ")}
                            </p>
                        </>
                    ),
                });
            }
            const newRows = rows.filter((row) => !deleted.includes(row.id));
            setSelected([]);
            setRows(newRows);
            message.success(deleteBatchSuccess);
            if (callbacks && callbacks.deleteSelected) {
                callbacks.deleteSelected();
            }
        } catch (err) {
            errorModal(err);
        } finally {
            setStatus(null);
        }
    };

    const onDeleteSelectedBtnClick = async () => {
        Modal.confirm({
            title: i18n.gettext("Do you want to delete these items?"),
            onOk() {
                deleteSelected();
            },
        });
    };

    const goToCreatePage = () => {
        const url = routeURL(model.create);
        window.open(url, "_self");
    };

    const canDelete = (item) => {
        if (itemProps.canDelete) {
            return itemProps.canDelete({ item });
        }
        return true;
    };

    const rowSelection = {
        onChange: (selectedRowKeys, selectedRows) => {
            setSelected(selectedRowKeys);
        },
        getCheckboxProps: (record) => ({
            disabled: !canDelete(record),
        }),
    };

    const columns_ = [
        ...columns,
        {
            title: "",
            key: "action",
            width: "0px",
            align: "center",
            render: (text, record) => (
                <div style={{ whiteSpace: "nowrap" }}>
                    <Tooltip title={i18n.gettext("Edit")}>
                        <Button
                            type="text"
                            shape="circle"
                            icon={<EditIcon />}
                            onClick={() => onEditClick(record.id)}
                        />
                    </Tooltip>
                    {canDelete(record) ? (
                        <Tooltip title={i18n.gettext("Delete")}>
                            <Popconfirm
                                placement="bottom"
                                title={deleteConfirm}
                                onConfirm={() => deleteModelItem(record.id)}
                            >
                                <Button
                                    type="text"
                                    shape="circle"
                                    icon={<DeleteForeverIcon />}
                                />
                            </Popconfirm>
                        </Tooltip>
                    ) : (
                        ""
                    )}
                </div>
            ),
        },
    ];

    const TableControl = () => (
        <Row type="flex" justify="space-between">
            <Col>
                <Input
                    placeholder={i18n.gettext("Search")}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                    }}
                    prefix={<SearchIcon />}
                    allowClear
                />
            </Col>
            <Col>
                <Space direction="horizontal">
                    {headerControls.map((control, idx) => (
                        <React.Fragment key={idx}>
                            {control({ selected, rows, setRows })}
                        </React.Fragment>
                    ))}
                    <Button
                        icon={<AddCircleIcon />}
                        type="primary"
                        onClick={goToCreatePage}
                        {...createProps}
                    >
                        {i18n.gettext("Create")}
                    </Button>
                </Space>
            </Col>
        </Row>
    );

    const SelectedControl = () => (
        <Space direction="horizontal">
            {selectedControls.map((control, idx) => (
                <React.Fragment key={idx}>
                    {control({selected, rows, setRows})}
                </React.Fragment>
            ))}

            <Badge count={selected.length} size="small">
                <Button
                    icon={<DeleteForeverIcon />}
                    onClick={onDeleteSelectedBtnClick}
                    loading={status === "deleting"}
                    danger
                >
                    {i18n.gettext("Delete")}
                </Button>
            </Badge>
        </Space>
    );

    return (
        <Space
            direction="vertical"
            style={{ width: "100%" }}
            className="ngw-gui-model-browse"
        >
            {selected.length ? SelectedControl() : TableControl()}
            <Table
                rowKey="id"
                showSorterTooltip={false}
                rowSelection={{
                    type: "checkbox",
                    selectedRowKeys: selected,
                    ...rowSelection,
                }}
                loading={status === "loading"}
                columns={columns_}
                dataSource={filteredRows}
                pagination={false}
                size="middle"
                {...tableProps}
            />
        </Space>
    );
}

ModelBrowse.propTypes = {
    model: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    columns: PropTypes.array.isRequired,
    messages: PropTypes.object,
    itemProps: PropTypes.object,
    createProps: PropTypes.object,
    headerControls: PropTypes.array,
    selectedControls: PropTypes.array,
    collectionOptions: PropTypes.object,
    collectionFilter: PropTypes.func,
    callbacks: PropTypes.shape({
        deleteSelected: PropTypes.func,
        deleteModelItem: PropTypes.func,
    }),
};
