import ArrowForward from "@material-icons/svg/arrow_forward";

import { Space, Table, Button } from "@nextgisweb/gui/antd";
import { sorterFactory } from "@nextgisweb/gui/util/sortedFactory";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { PropTypes } from "prop-types";
import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

const { Column } = Table;

export const ResourceChildren = observer(({ resourceStore }) => {
    const {
        children,
        childrenLoading,
        disabledIds,
        enabledCls,
        selected,
        allowMoveInside,
        allowSelection,
    } = resourceStore;

    const [selectionType] = useState("radio");

    const getCheckboxProps = (record) => {
        const props = { disabled: false };

        const disableChecker = [
            {
                useCheck: () => Array.isArray(disabledIds),
                isDisabled: () => disabledIds.includes(record.id),
            },
            {
                useCheck: () => Array.isArray(enabledCls),
                isDisabled: () => !enabledCls.includes(record.cls),
            },
        ];
        props.disabled = disableChecker.some((check) => {
            if (check.useCheck()) {
                return check.isDisabled();
            }
            return true;
        });

        return props;
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
        const { disabled } = getCheckboxProps(record);
        if (disabled || !allowMoveInside) {
            return <></>;
        }
        const onClick = () => {
            resourceStore.changeParentTo(record.id);
        };
        return (
            <Button shape="circle" icon={<ArrowForward />} onClick={onClick} />
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
        >
            <Column
                title={i18n.gettext("Display name")}
                className="displayName"
                dataIndex="displayName"
                sorter={sorterFactory("displayName")}
                render={(value, record) => (
                    <Space>
                        <svg className="icon">
                            <use xlinkHref={`#icon-rescls-${record.cls}`} />
                        </svg>
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

ResourceChildren.propTypes = {
    resourceStore: PropTypes.object,
};
