import { uniq } from "lodash-es";
import { useCallback, useEffect, useState } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { Button, Space, Table } from "@nextgisweb/gui/antd";
import { RemoveIcon } from "@nextgisweb/gui/icon";
import type { ParamsOf } from "@nextgisweb/gui/type";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import type {
    CompositeRead,
    ResourceRead,
} from "@nextgisweb/resource/type/api";

import { ResourcePickerStore } from "../resource-picker";
import { useResourcePicker } from "../resource-picker/hook";
import type { SelectValue } from "../resource-picker/type";

import type { ResourceSelectProps } from "./type";

import ManageSearchIcon from "@nextgisweb/icon/material/manage_search";

type TableProps = ParamsOf<typeof Table>;
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
    const [resources, setResources] = useState<ResourceRead[]>([]);
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

        const promises: Promise<CompositeRead>[] = [];
        const getOpt = {
            cache: true,
            signal: makeSignal(),
        };
        for (const id of ids) {
            const promise = route("resource.item", id).get(getOpt);
            promises.push(promise);
        }
        try {
            const resp = await Promise.all(promises);
            const resources_ = resp.map((r) => {
                const res = r.resource;
                return res;
            });
            const enabledResources = resources_.filter((r) =>
                store.checkEnabled(r)
            );
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
                        href={routeURL(
                            "resource.show",
                            (row as ResourceRead).id
                        )}
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
