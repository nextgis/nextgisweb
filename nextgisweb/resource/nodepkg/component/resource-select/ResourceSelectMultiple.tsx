import { uniq } from "lodash-es";
import { useCallback, useEffect, useState } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { Button, Space, Table } from "@nextgisweb/gui/antd";
import { RemoveIcon } from "@nextgisweb/gui/icon";
import type { ParamsOf } from "@nextgisweb/gui/type";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { resourceAttrItems } from "@nextgisweb/resource/api/resource-attr";

import { ResourcePickerStore } from "../resource-picker";
import { useResourcePicker } from "../resource-picker/hook";
import { ResourcePickerDefaultAttrs } from "../resource-picker/type";
import type { ResourcePickerAttr, SelectValue } from "../resource-picker/type";

import type { ResourceSelectProps } from "./type";

import ManageSearchIcon from "@nextgisweb/icon/material/manage_search";

type TableProps = ParamsOf<typeof Table<ResourcePickerAttr>>;
type ColumnParams = NonNullable<TableProps["columns"]>;
type RowSelection = NonNullable<TableProps["rowSelection"]>;

const ResourceSelectMultiple = ({
    value: initResourceIds = [],
    onChange,
    pickerOptions = {},
}: ResourceSelectProps<number[]>) => {
    const { makeSignal, abort } = useAbortController();
    const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
    const [ids, setIds] = useState(() => uniq(initResourceIds));
    const [resources, setResources] = useState<ResourcePickerAttr[]>([]);
    const [loading, setLoading] = useState(false);
    const { modalHolder, modalStore } = useShowModal();
    const { showResourcePicker } = useResourcePicker({
        modalStore,
        initParentId: pickerOptions.initParentId || pickerOptions.parentId,
    });

    const [store] = useState(
        () =>
            new ResourcePickerStore({
                ...pickerOptions,
                multiple: true,
            })
    );

    const onSelect = (addIds: SelectValue) => {
        const newIds = [...ids];
        for (const addId of [addIds].flat()) {
            if (!newIds.includes(addId)) {
                newIds.push(addId);
            }
        }
        if (onChange) {
            onChange(newIds);
        }
        setIds(newIds);
    };

    const loadResources = useCallback(async () => {
        abort();
        setLoading(true);

        const getOpt = {
            cache: true,
            signal: makeSignal(),
        };

        try {
            const resp = await resourceAttrItems({
                resources: ids,
                attributes: [...ResourcePickerDefaultAttrs],
                route: route("resource.attr"),
                ...getOpt,
            });

            const enabledResources = resp.filter((r) => store.checkEnabled(r));
            setResources(enabledResources);
        } finally {
            setLoading(false);
        }
    }, [ids, abort, makeSignal, store]);

    const columns: ColumnParams = [
        {
            title: "Name",
            dataIndex: "display_name",
            render: (text, row) => {
                return (
                    <a
                        href={routeURL("resource.show", row.id)}
                        onClick={(evt) => evt.stopPropagation()}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {text}
                    </a>
                );
            },
        },
    ];

    const onClick = () => {
        store.disableResourceIds = ids;
        showResourcePicker({
            pickerOptions,
            store,
            onSelect,
        });
    };

    const removeSelected = () => {
        setIds((old) => {
            if (selectedRowKeys.length) {
                return old.filter((oldId) => !selectedRowKeys.includes(oldId));
            }
            return old;
        });
    };

    const rowSelection: RowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys.map(Number));
        },
    };

    useEffect(() => {
        loadResources();
        setSelectedRowKeys((old) => {
            return old.filter((oldId) => !ids.includes(oldId));
        });
    }, [ids, loadResources]);

    return (
        <>
            {modalHolder}
            <Space.Compact>
                <div style={{ width: "100%" }}>
                    <div style={{ marginBottom: 16 }}>
                        <Space>
                            <Button
                                disabled={!selectedRowKeys.length}
                                onClick={removeSelected}
                                icon={<RemoveIcon />}
                            />
                            <Button
                                onClick={onClick}
                                icon={<ManageSearchIcon />}
                            />
                        </Space>
                    </div>
                    <Table
                        rowKey="id"
                        expandable={{ childrenColumnName: "children_" }}
                        rowSelection={rowSelection}
                        dataSource={resources}
                        columns={columns}
                        showHeader={false}
                        loading={loading}
                        pagination={false}
                    />
                </div>
            </Space.Compact>
        </>
    );
};

export { ResourceSelectMultiple };
