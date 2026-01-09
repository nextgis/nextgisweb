import { Fragment, useEffect, useMemo, useState } from "react";
import type { FC } from "react";

import {
    Badge,
    Button,
    Col,
    Input,
    Modal,
    Popconfirm,
    Row,
    Space,
    Table,
    Tooltip,
    message,
} from "@nextgisweb/gui/antd";
import type {
    ButtonProps,
    TableProps,
    TableRowSelection,
} from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import {
    AddIcon,
    DeleteIcon,
    EditIcon,
    SearchIcon,
} from "@nextgisweb/gui/icon";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import type {
    KeysWithMethodAndPath,
    KeysWithMethods,
    KeysWithPaths,
    RequestOptionsByMethod,
} from "@nextgisweb/pyramid/api/type";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

import VisibilityIcon from "@nextgisweb/icon/material/visibility";

export interface ModalBrowseData {
    id: number;
}

export interface Model {
    item: KeysWithMethodAndPath<["get", "delete", "put"], ["id"]>;
    collection: KeysWithMethods<["get", "post"]>;
    edit: KeysWithPaths<[]>;
    browse: KeysWithMethods<[]>;
    create: KeysWithPaths<[]>;
}

export interface ControlProps<Data extends ModalBrowseData = ModalBrowseData> {
    disable?: boolean;
    selected: number[];
    rows: Data[];
    setRows: React.Dispatch<React.SetStateAction<Data[]>>;
}

interface ModelBrowseProps<
    Data extends ModalBrowseData = ModalBrowseData,
> extends TableProps<Data> {
    model: string | Model;
    messages?: {
        deleteConfirm?: string;
        deleteSuccess?: string;
        deleteBatchSuccess?: string;
    };
    callbacks?: {
        deleteModelItem?: () => void;
        deleteSelected?: () => void;
    };
    itemProps?: {
        canDelete?: (args: { item: Data }) => boolean;
    };
    readonly?: boolean;
    showActionColumn?: boolean;
    showCreate?: boolean;
    customRowSelection?: TableRowSelection<Data>;

    createProps?: ButtonProps;
    headerControls?: FC<ControlProps<Data>>[];
    selectedControls?: FC<ControlProps<Data>>[];
    collectionOptions?: RequestOptionsByMethod<"get">;
    collectionFilter?: (item: Data) => boolean;
}

interface TableControlProps {
    showCreate: boolean;
}

export function ModelBrowse<Data extends ModalBrowseData = ModalBrowseData>({
    model: m,
    columns,
    messages,
    callbacks = {},
    itemProps = {},
    showActionColumn = true,
    showCreate = true,
    customRowSelection,
    createProps = {},
    headerControls = [],
    selectedControls = [],
    collectionFilter,
    collectionOptions,
    ...tableProps
}: ModelBrowseProps<Data>) {
    const [modal, modalContextHolder] = Modal.useModal();
    const [messageApi, messageContextHolder] = message.useMessage();

    const model: Model =
        typeof m === "string"
            ? ({
                  item: m + ".item",
                  collection: m + ".collection",
                  edit: m + ".edit",
                  browse: m + ".browse",
                  create: m + ".create",
              } as Model)
            : m;

    const msg = messages || {};
    const deleteConfirm = msg.deleteConfirm || gettext("Confirmation");
    const deleteSuccess = msg.deleteSuccess || gettext("Item deleted");
    const deleteBatchSuccess =
        msg.deleteBatchSuccess || gettext("Items deleted");

    const { data, isLoading } = useRouteGet<Data[]>({
        name: model.collection,
        options: collectionOptions,
    });

    const [rows, setRows] = useState<Data[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<number[]>([]);

    const readonly = tableProps.readonly;

    useEffect(() => {
        if (data) {
            setRows(data.filter(collectionFilter || (() => true)));
        }
    }, [data, collectionFilter]);

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

    const deleteModelItem = async (id: number) => {
        try {
            await route(model.item, id).delete();
            const newRows = rows.filter((row) => row.id !== id);
            const newSelectedRows = selected.filter((row) => row !== id);
            setRows(newRows);
            setSelected(newSelectedRows);
            messageApi.success(deleteSuccess);
            if (callbacks && callbacks.deleteModelItem) {
                callbacks.deleteModelItem();
            }
        } catch (err) {
            errorModal(err);
        }
    };

    const deleteSelected = async () => {
        setIsDeleting(true);
        try {
            const deleted: number[] = [];
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
                modal.confirm({
                    type: "error",
                    title: gettext("The errors occurred during execution"),
                    content: (
                        <>
                            <p>
                                {gettext("Failed to delete items:")}{" "}
                                {deleteError.join(", ")}
                            </p>
                        </>
                    ),
                });
            }
            const newRows = rows.filter((row) => !deleted.includes(row.id));
            setSelected([]);
            setRows(newRows);
            messageApi.success(deleteBatchSuccess);
            if (callbacks && callbacks.deleteSelected) {
                callbacks.deleteSelected();
            }
        } catch (err) {
            errorModal(err);
        } finally {
            setIsDeleting(false);
        }
    };

    const onDeleteSelectedBtnClick = async () => {
        modal.confirm({
            title: gettext("Do you want to delete these items?"),
            onOk() {
                deleteSelected();
            },
        });
    };

    const goToCreatePage = () => {
        const url = routeURL(model.create);
        window.open(url, "_self");
    };

    const canDelete = (item: Data) => {
        if (readonly) {
            return false;
        } else if (itemProps.canDelete) {
            return itemProps.canDelete({ item });
        }
        return true;
    };

    const tableColumns: TableProps<Data>["columns"] = [
        ...(columns ? columns : []),
    ];

    if (showActionColumn) {
        tableColumns.push({
            title: "",
            key: "action",
            width: "0px",
            align: "center",
            render: (_, record) => (
                <div style={{ whiteSpace: "nowrap" }}>
                    <Tooltip
                        title={!readonly ? gettext("Edit") : gettext("View")}
                    >
                        <Button
                            type="text"
                            shape="circle"
                            icon={!readonly ? <EditIcon /> : <VisibilityIcon />}
                            href={routeURL(model.edit, record.id)}
                        />
                    </Tooltip>
                    {canDelete(record as Data) && (
                        <Tooltip title={gettext("Delete")}>
                            <Popconfirm
                                placement="bottom"
                                title={deleteConfirm}
                                onConfirm={() => deleteModelItem(record.id)}
                            >
                                <Button
                                    type="text"
                                    shape="circle"
                                    icon={<DeleteIcon />}
                                />
                            </Popconfirm>
                        </Tooltip>
                    )}
                </div>
            ),
        });
    }

    const TableControl = ({ showCreate }: TableControlProps) => (
        <Row justify="space-between">
            <Col>
                <Input
                    placeholder={gettext("Search")}
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
                    {headerControls.map((Control, idx) => (
                        <Fragment key={idx}>
                            <Control {...{ selected, rows, setRows }} />
                        </Fragment>
                    ))}

                    {showCreate && (
                        <Button
                            icon={<AddIcon />}
                            onClick={goToCreatePage}
                            {...createProps}
                            type="primary"
                        >
                            {gettext("Create")}
                        </Button>
                    )}
                </Space>
            </Col>
        </Row>
    );

    const SelectedControl = () => (
        <Space direction="horizontal">
            {selectedControls.map((Control, idx) => (
                <Fragment key={idx}>
                    <Control {...{ selected, rows, setRows }} />
                </Fragment>
            ))}

            <Badge count={selected.length} size="small">
                <Button
                    icon={<DeleteIcon />}
                    onClick={onDeleteSelectedBtnClick}
                    loading={isDeleting}
                    danger
                >
                    {gettext("Delete")}
                </Button>
            </Badge>
        </Space>
    );

    const rowSelectionDefault: TableProps<Data>["rowSelection"] = {
        onChange: (selectedRowKeys) => {
            setSelected(selectedRowKeys.map(Number));
        },
        getCheckboxProps: (record) => ({
            disabled: !canDelete(record as Data),
        }),
    };

    let rowSelection;
    if (customRowSelection) {
        rowSelection = customRowSelection;
    } else if (!readonly) {
        rowSelection = {
            type: "checkbox",
            selectedRowKeys: selected,
            ...rowSelectionDefault,
        } as TableRowSelection<Data>;
    }

    let headSection;
    if (!readonly) {
        headSection = selected.length
            ? SelectedControl()
            : TableControl({ showCreate });
    }

    return (
        <Space
            direction="vertical"
            style={{ width: "100%" }}
            className="ngw-gui-model-browse"
        >
            {modalContextHolder}
            {messageContextHolder}
            {headSection}
            <Table
                size="middle"
                card={true}
                showSorterTooltip={false}
                rowSelection={rowSelection}
                loading={isLoading}
                columns={tableColumns}
                dataSource={filteredRows}
                rowKey="id"
                {...tableProps}
            />
        </Space>
    );
}
