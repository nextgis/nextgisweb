import { PropTypes } from "prop-types";

import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import { Button, Table } from "@nextgisweb/gui/antd";
import { sorterFactory } from "@nextgisweb/gui/util";
import i18n from "@nextgisweb/pyramid/i18n";

import usePickerCard from "./hook/usePickerCard";
import { renderResourceCls } from "./util/renderResourceCls";

import FolderOpenIcon from "@material-icons/svg/arrow_forward";

const { Column } = Table;

export const ResourcePickerChildren = observer(({ resourceStore }) => {
    const {
        multiple,
        selected,
        resources,
        allowSelection,
        allowMoveInside,
        resourcesLoading,
        getResourceClasses,
        traverseClasses,
    } = resourceStore;

    const [selectionType] = useState(() => (multiple ? "" : "radio"));
    const { getCheckboxProps } = usePickerCard({ resourceStore });

    const dataSource = useMemo(() => {
        const children_ = [];
        for (const x of resources) {
            const res = x.resource;
            const formattedRes = {
                displayName: res.display_name,
                hasChildren: res.children,
                ...res,
            };
            delete formattedRes.children;
            children_.push(formattedRes);
        }
        return children_;
    }, [resources]);

    const rowSelection = useMemo(() => {
        return {
            getCheckboxProps,
            selectedRowKeys: selected,
            onChange: (selectedRowKeys) => {
                resourceStore.setSelected(selectedRowKeys);
            },
        };
    }, [getCheckboxProps, resourceStore, selected]);

    const renderActions = (_, record) => {
        const classes = getResourceClasses([record.cls]);
        const isGroup = classes.some((cls) => cls === "resource_group");

        const allowMoveToEmpty = isGroup ? true : record.hasChildren

        const disabled =
            traverseClasses &&
            !classes.some((cls) => traverseClasses.includes(cls));

        if (disabled || !allowMoveToEmpty || !allowMoveInside) {
            return <></>;
        }
        const onClick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            resourceStore.changeParentTo(record.id);
        };
        return (
            <Button
                shape="circle"
                icon={<FolderOpenIcon />}
                onClick={onClick}
            />
        );
    };

    return (
        <Table
            style={{ height: "100%" }}
            showHeader={false}
            dataSource={dataSource}
            rowKey="id"
            size="middle"
            loading={resourcesLoading}
            rowSelection={
                allowSelection && {
                    type: selectionType,
                    ...rowSelection,
                }
            }
            onRow={(record) => {
                return {
                    onClick: () => {
                        const props = getCheckboxProps(record);
                        if (props.disabled) {
                            return;
                        }
                        const existIndex = selected.indexOf(record.id);

                        let newSelected = multiple ? [...selected] : [];
                        newSelected.push(record.id);

                        // unselect on second click
                        if (existIndex !== -1) {
                            newSelected = [...selected];
                            newSelected.splice(existIndex, 1);
                        }

                        resourceStore.setSelected(newSelected);
                    },
                };
            }}
        >
            <Column
                title={i18n.gettext("Display name")}
                className="displayName"
                dataIndex="displayName"
                sorter={sorterFactory("displayName")}
                render={(value, record) =>
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
});

ResourcePickerChildren.propTypes = {
    resourceStore: PropTypes.object,
};
