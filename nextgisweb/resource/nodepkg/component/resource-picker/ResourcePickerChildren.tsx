import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import debounce from "lodash-es/debounce";

import FolderOpenIcon from "@material-icons/svg/arrow_forward";
import { Button, Table } from "@nextgisweb/gui/antd";
import { sorterFactory } from "@nextgisweb/gui/util";

import usePickerCard from "./hook/usePickerCard";
import type {
    PickerResource,
    ResourcePickerChildrenProps,
    RowSelection,
    RowSelectionType,
} from "./type";
import { renderResourceCls } from "./util/renderResourceCls";

import i18n from "@nextgisweb/pyramid/i18n";

import type { ColumnProps } from "antd/lib/table/Column";

const { Column } = Table;

const mDisplayName = i18n.gettext("Display name");

export const ResourcePickerChildren = observer(
    ({ resourceStore, onOk }: ResourcePickerChildrenProps) => {
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

        const renderActions: ColumnProps<PickerResource>["render"] = (
            _,
            record
        ) => {
            const classes = getResourceClasses([record.cls]);
            const isGroup = classes.some((cls) => cls === "resource_group");

            const allowMoveToEmpty = isGroup ? true : !!record.children;

            const disabled =
                traverseClasses &&
                !classes.some((cls) => traverseClasses.includes(cls));

            if (disabled || !allowMoveToEmpty || !allowMoveInside) {
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
                            return;
                        }
                        const existIndex = selected.indexOf(r.id);

                        let newSelected = multiple ? [...selected] : [];

                        // unselect on second click
                        if (existIndex !== -1) {
                            if (!(pick && onOk)) {
                                newSelected = [...selected];
                                newSelected.splice(existIndex, 1);
                            }
                        } else {
                            newSelected.push(r.id);
                        }

                        resourceStore.setSelected(newSelected);
                        if (pick && onOk) {
                            onOk(r.id);
                        }
                    };
                    return {
                        onDoubleClick: () => {
                            select(true);
                        },
                        onClick: debounce(() => {
                            select();
                        }, 500),
                    };
                }}
            >
                <Column
                    title={mDisplayName}
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
);
