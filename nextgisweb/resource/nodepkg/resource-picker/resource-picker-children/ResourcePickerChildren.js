import { PropTypes } from "prop-types";

import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import { Button, Space, Table } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import { sorterFactory } from "@nextgisweb/gui/util/sortedFactory";
import i18n from "@nextgisweb/pyramid/i18n!resource";

import FolderOpenIcon from "@material-icons/svg/arrow_forward";

const { Column } = Table;

export const ResourcePickerChildren = observer(({ resourceStore }) => {
    const {
        selected,
        children,
        multiple,
        disabledIds,
        checkEnabled,
        moveInsideCls,
        allowSelection,
        allowMoveInside,
        childrenLoading,
    } = resourceStore;

    const [selectionType] = useState(multiple ? "" : "radio");

    const getEnabledProps = (record, checks) => {
        const props = { disabled: false };

        const disableChecker = [
            {
                check: () => Array.isArray(disabledIds),
                isDisabled: () => disabledIds.includes(record.id),
            },
            ...checks,
        ];
        props.disabled = disableChecker.some((check) => {
            const ok = check.check ? check.check() : true;
            if (ok) {
                return check.isDisabled();
            }
            return true;
        });

        return props;
    };
    const getCheckboxProps = (record) => {
        return getEnabledProps(record, [
            {
                isDisabled: () => !checkEnabled.call(resourceStore, record),
            },
        ]);
    };

    const rowSelection = useMemo(() => {
        return {
            getCheckboxProps,
            selectedRowKeys: selected,
            onChange: (selectedRowKeys) => {
                resourceStore.setSelected(selectedRowKeys);
            },
        };
    }, [selected]);

    const renderActions = (actions, record) => {
        const { disabled } = getEnabledProps(record, [
            {
                isDisabled: () => !moveInsideCls.includes(record.cls),
            },
        ]);
        if (disabled || !allowMoveInside) {
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
            dataSource={children}
            rowKey="id"
            pagination={false}
            size="middle"
            loading={childrenLoading}
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
                render={(value, record) => (
                    <Space>
                        <SvgIcon icon={`rescls-${record.cls}`} />
                        {value}
                    </Space>
                )}
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
