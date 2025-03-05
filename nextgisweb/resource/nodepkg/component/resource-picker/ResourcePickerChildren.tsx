import type { ColumnProps } from "antd/lib/table/Column";
import { debounce } from "lodash-es";
import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";

import { Button, Table } from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { sorterFactory } from "@nextgisweb/gui/util";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { renderResourceCls } from "../../util/renderResourceCls";

import usePickerCard from "./hook/usePickerCard";
import type {
    PickerResource,
    ResourcePickerChildrenProps,
    RowSelectionType,
    SelectValue,
} from "./type";

import FolderOpenIcon from "@nextgisweb/icon/material/arrow_forward";

import "./ResourcePickerChildren.less";

const msgDislpayName = gettext("Display name");

function ResourcePickerChildrenInner<V extends SelectValue = SelectValue>({
    store,
    onOk,
}: ResourcePickerChildrenProps<V>) {
    const {
        loading,
        multiple,
        selected,
        resources,
        allowSelection,
        traverseClasses,
        allowMoveInside,
        getResourceClasses,
    } = store;

    const [selectionType] = useState<RowSelectionType>(() =>
        multiple ? "checkbox" : "radio"
    );
    const { getCheckboxProps } = usePickerCard({ store });

    const dataSource = useMemo(() => {
        const children: PickerResource[] = [];
        if (resources) {
            for (const x of resources) {
                children.push(x.resource);
            }
        }
        return children;
    }, [resources]);

    const rowSelection = useMemo(() => {
        if (allowSelection) {
            const rowSelection_: TableProps["rowSelection"] = {
                type: selectionType,
                getCheckboxProps,
                selectedRowKeys: selected,
                onChange: (selectedRowKeys) => {
                    store.setSelected(selectedRowKeys.map(Number));
                },
            };
            return rowSelection_;
        }
    }, [selected, selectionType, store, allowSelection, getCheckboxProps]);

    const canTraverse = useCallback(
        (record: PickerResource) => {
            const classes = getResourceClasses([record.cls]);
            const isGroup = classes.some((cls) => cls === "resource_group");
            const disabled =
                traverseClasses &&
                !classes.some((cls) => traverseClasses.includes(cls));
            const allowMoveToEmpty = isGroup ? true : !!record.children;
            return !(disabled || !allowMoveToEmpty || !allowMoveInside);
        },
        [allowMoveInside, getResourceClasses, traverseClasses]
    );

    const renderActions = useCallback<
        NonNullable<ColumnProps<PickerResource>["render"]>
    >(
        (_, record) => {
            if (!canTraverse(record)) {
                return <></>;
            }
            return (
                <Button
                    type="text"
                    shape="circle"
                    icon={<FolderOpenIcon />}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        store.changeParentTo(record.id);
                    }}
                />
            );
        },
        [canTraverse, store]
    );

    const columns = useMemo<TableProps["columns"]>(
        () => [
            {
                title: msgDislpayName,
                className: "displayName",
                dataIndex: "display_name",
                sorter: sorterFactory("display_name"),
                render: (value, { cls }: PickerResource) =>
                    renderResourceCls({ name: value, cls }),
            },
            {
                className: "actions",
                dataIndex: "actions",
                render: renderActions,
            },
        ],
        [renderActions]
    );

    const onRow = useCallback(
        (record: PickerResource) => {
            const select = (pick = false) => {
                const props = getCheckboxProps(record);

                if (props.disabled) {
                    if (pick && canTraverse(record)) {
                        store.changeParentTo(record.id);
                    }
                    return;
                }
                if (pick && onOk) {
                    const toPick = multiple ? [record.id] : record.id;
                    onOk(toPick as V);
                    return;
                }
                const existIndex = selected.indexOf(record.id);

                let newSelected = multiple ? [...selected] : [];

                // unselect on second click
                if (existIndex !== -1) {
                    newSelected = [...selected];
                    newSelected.splice(existIndex, 1);
                } else {
                    newSelected.push(record.id);
                }

                store.setSelected(newSelected);
            };
            return {
                onDoubleClick: () => {
                    select(true);
                },
                onClick: debounce(() => {
                    select();
                }, 150),
            };
        },
        [canTraverse, getCheckboxProps, multiple, onOk, store, selected]
    );

    return (
        <Table
            className="ngw-resource-component-resource-picker-children"
            parentHeight
            showHeader={false}
            expandable={{ childrenColumnName: "children_" }}
            dataSource={dataSource}
            columns={columns}
            rowKey="id"
            size="middle"
            loading={loading.setChildrenFor}
            rowSelection={rowSelection}
            onRow={onRow}
        />
    );
}
export const ResourcePickerChildren = observer(ResourcePickerChildrenInner);
ResourcePickerChildren.displayName = "ResourcePickerChildren";
