import { theme } from "antd";
import { debounce } from "lodash-es";
import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";

import { Badge, Button, Table } from "@nextgisweb/gui/antd";
import type { TableColumnProps, TableProps } from "@nextgisweb/gui/antd";
import { sorterFactory } from "@nextgisweb/gui/util";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    ResourceCls,
    ResourceInterface,
} from "@nextgisweb/resource/type/api";

import { renderResourceCls } from "../../util/renderResourceCls";

import usePickerCard from "./hook/usePickerCard";
import type {
    PickerResource,
    ResourcePickerChildrenProps,
    RowSelectionType,
    SelectValue,
} from "./type";

import FolderOpenIcon from "@nextgisweb/icon/material/arrow_forward";
import SelectFirstIcon from "@nextgisweb/icon/material/editor_choice";
import { LoadingOutlined } from "@ant-design/icons";

import "./ResourcePickerChildren.less";

const msgDislpayName = gettext("Display name");
const msgSelectFirst = gettext("Select first eligible child resource");

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
        loadingParentsChildren,
        selectedParentsRegistry,
        getResourceClasses,
    } = store;

    const [selectionType] = useState<RowSelectionType>(() =>
        multiple ? "checkbox" : "radio"
    );
    const { getCheckboxProps } = usePickerCard({ store });

    const dataSource = useMemo(
        () => (resources ? resources.map((x) => x.resource) : []),
        [resources]
    );

    const rowSelection = useMemo(() => {
        if (!allowSelection) return;
        return {
            type: selectionType,
            getCheckboxProps,
            selectedRowKeys: selected,
            onChange: (selectedRowKeys: (string | number)[]) => {
                const newKeys = selectedRowKeys.map(Number);

                const dataSourceIds = dataSource.map((item) => item.id);
                let newSelected: number[];

                if (newKeys.length === 0) {
                    newSelected = selected.filter(
                        (id) => !dataSourceIds.includes(id)
                    );
                } else {
                    const preserved = selected.filter(
                        (id) => !dataSourceIds.includes(id)
                    );

                    const updatedCurrent = dataSourceIds.filter((id) =>
                        newKeys.includes(id)
                    );
                    newSelected = [...preserved, ...updatedCurrent];
                }
                store.setSelected(newSelected);
            },
        } as TableProps["rowSelection"];
    }, [
        getCheckboxProps,
        allowSelection,
        selectionType,
        dataSource,
        selected,
        store,
    ]);

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

    const { token } = theme.useToken();
    const colorPrimary = token.colorPrimary;

    const renderActions = useCallback<
        NonNullable<TableColumnProps<PickerResource>["render"]>
    >(
        (_, record) => {
            let openBtn: React.ReactNode = undefined;
            let selectFirstBtn: React.ReactNode = undefined;
            if (canTraverse(record)) {
                const selectedParent = store.multiple
                    ? selectedParentsRegistry.get(record.id)
                    : undefined;
                const childrenCount = selectedParent
                    ? selectedParent.children.length
                    : undefined;
                openBtn = (
                    <Badge
                        dot={!!childrenCount}
                        count={childrenCount}
                        offset={[-4, 4]}
                        color={colorPrimary}
                    >
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
                    </Badge>
                );

                const findFirstInterfaces: ResourceInterface[] = [
                    "IFeatureLayer",
                ];
                const findFirstClasses: ResourceCls[] = ["raster_layer"];

                const canSelectFirstChildren =
                    record.interfaces.some((resInterface) =>
                        findFirstInterfaces.includes(resInterface)
                    ) || findFirstClasses.includes(record.cls);

                if (!selectedParent && canSelectFirstChildren && multiple) {
                    selectFirstBtn = (
                        <Button
                            type="text"
                            shape="circle"
                            loading={loadingParentsChildren.has(record.id)}
                            icon={<SelectFirstIcon />}
                            title={msgSelectFirst}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                store.selectFirstChildren(record.id);
                            }}
                        />
                    );
                }
            }

            return (
                <>
                    {selectFirstBtn}
                    {openBtn}
                </>
            );
        },
        [
            canTraverse,
            colorPrimary,
            loadingParentsChildren,
            multiple,
            selectedParentsRegistry,
            store,
        ]
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
                align: "right",
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
                if (pick && onOk && !multiple) {
                    const toPick = multiple ? [record.id] : record.id;
                    onOk(toPick as V);
                    return;
                }
                const existIndex = selected.indexOf(record.id);
                const newSelected = multiple ? [...selected] : [];
                // unselect on second click
                if (existIndex !== -1) {
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
            loading={
                loading.setChildrenFor && { indicator: <LoadingOutlined /> }
            }
            rowSelection={rowSelection}
            onRow={onRow}
        />
    );
}

export const ResourcePickerChildren = observer(ResourcePickerChildrenInner);
ResourcePickerChildren.displayName = "ResourcePickerChildren";
