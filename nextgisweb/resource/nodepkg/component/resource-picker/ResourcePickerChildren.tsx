import type { ColumnProps } from "antd/lib/table/Column";
import debounce from "lodash-es/debounce";
import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";

import { Button, Table } from "@nextgisweb/gui/antd";
import { sorterFactory } from "@nextgisweb/gui/util";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { renderResourceCls } from "../../util/renderResourceCls";

import usePickerCard from "./hook/usePickerCard";
import type {
    PickerResource,
    ResourcePickerChildrenProps,
    RowSelection,
    RowSelectionType,
    SelectValue,
} from "./type";

import FolderOpenIcon from "@nextgisweb/icon/material/arrow_forward";

const { Column } = Table;

const msgDislpayName = gettext("Display name");

function ResourcePickerChildrenInner<V extends SelectValue = SelectValue>({
    resourceStore,
    onOk,
}: ResourcePickerChildrenProps<V>) {
    const {
        multiple,
        selected,
        resources,
        allowSelection,
        traverseClasses,
        allowMoveInside,
        resourcesLoading,
        getResourceClasses,
    } = resourceStore;

    const [selectionType] = useState<RowSelectionType>(() =>
        multiple ? "checkbox" : "radio"
    );
    const { getCheckboxProps } = usePickerCard({ resourceStore });

    const dataSource = useMemo(() => {
        const children_: PickerResource[] = [];
        for (const x of resources) {
            children_.push(x.resource);
        }
        return children_;
    }, [resources]);

    const rowSelection = useMemo(() => {
        const s: RowSelection = {
            getCheckboxProps,
            selectedRowKeys: selected,
            onChange: (selectedRowKeys) => {
                resourceStore.setSelected(selectedRowKeys.map(Number));
            },
        };
        return s;
    }, [getCheckboxProps, resourceStore, selected]);

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

    const renderActions: ColumnProps<PickerResource>["render"] = (
        _,
        record
    ) => {
        if (!canTraverse(record)) {
            return <></>;
        }
        return (
            <Button
                shape="circle"
                icon={<FolderOpenIcon />}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    resourceStore.changeParentTo(record.id);
                }}
            />
        );
    };

    return (
        <Table
            style={{ height: "100%" }}
            className=""
            showHeader={false}
            expandable={{ childrenColumnName: "children_" }}
            dataSource={dataSource}
            rowKey="id"
            size="middle"
            loading={resourcesLoading}
            rowSelection={
                allowSelection
                    ? {
                          type: selectionType,
                          ...rowSelection,
                      }
                    : undefined
            }
            onRow={(record) => {
                const select = (pick = false) => {
                    const r = record as PickerResource;
                    const props = getCheckboxProps(r);

                    if (props.disabled) {
                        if (pick && canTraverse(r)) {
                            resourceStore.changeParentTo(r.id);
                        }
                        return;
                    }
                    if (pick && onOk) {
                        const toPick = multiple ? [r.id] : r.id;
                        onOk(toPick as V);
                        return;
                    }
                    const existIndex = selected.indexOf(r.id);

                    let newSelected = multiple ? [...selected] : [];

                    // unselect on second click
                    if (existIndex !== -1) {
                        newSelected = [...selected];
                        newSelected.splice(existIndex, 1);
                    } else {
                        newSelected.push(r.id);
                    }

                    resourceStore.setSelected(newSelected);
                };
                return {
                    onDoubleClick: () => {
                        select(true);
                    },
                    onClick: debounce(() => {
                        select();
                    }, 150),
                };
            }}
        >
            <Column
                title={msgDislpayName}
                className="displayName"
                dataIndex="display_name"
                sorter={sorterFactory("display_name")}
                render={(value, record: PickerResource) =>
                    renderResourceCls({ name: value, cls: record.cls })
                }
            />
            <Column
                width={30}
                className="actions"
                dataIndex="actions"
                render={renderActions}
            />
        </Table>
    );
}
export const ResourcePickerChildren = observer(ResourcePickerChildrenInner);
