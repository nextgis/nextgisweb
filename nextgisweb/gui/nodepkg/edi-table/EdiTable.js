import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Table } from "../antd";

import { ActionButton, ErrorButton, WELLKNOWN_ROW_ACTIONS } from "./RowAction";

import "./EdiTable.less";

const RowActions = observer(({ row, store, actions }) => {
    const errorMessage = store.validate && row.error;
    return (
        <>
            {errorMessage && <ErrorButton message={errorMessage} />}
            {actions.map(({ callback, ...props }) => (
                <ActionButton onClick={() => callback(row)} {...props} />
            ))}
        </>
    );
});

const DEFAULT_ROW_ACTIONS = Object.keys(WELLKNOWN_ROW_ACTIONS);

export const EdiTable = observer(
    ({
        className,
        store,
        columns,
        rowActions = DEFAULT_ROW_ACTIONS,
        size = "small",
        ...tableProps
    }) => {
        className = (className ? className + " " : "") + "ngw-gui-edi-table";

        const rows = [...store.rows];
        const placeholder = store.placeholder;
        placeholder && rows.push(placeholder);

        const rowActionsObj = useMemo(() => {
            const result = [];
            for (let act of rowActions) {
                if (typeof act === "string") {
                    act = { key: act, ...WELLKNOWN_ROW_ACTIONS[act] };
                }

                if (typeof act.callback === "string") {
                    act.callback = store[act.callback];
                    if (!act.callback) continue;
                    act.callback = act.callback.bind(store);
                }

                result.push(act);
            }
            return result;
        }, [store, rowActions]);

        const tableColumns = useMemo(() => {
            const isPlaceholder = (row) => row === placeholder;
            const result = columns.map(
                (
                    { key, className, component, shrink, ...columnProps },
                    idx
                ) => {
                    className = className ? className : key;
                    if (shrink) className += " shrink";
                    const minWidth = shrink !== true ? shrink : undefined;

                    const result = { key, ...columnProps };

                    if (component) {
                        const Component = component;
                        result.render = (value, row) => (
                            <Component
                                {...{ value, row }}
                                placeholder={isPlaceholder(row)}
                            />
                        );
                    }

                    result.onCell = (row) => {
                        if (isPlaceholder(row)) {
                            if (idx === 0) {
                                return {
                                    colSpan: columns.length + 1,
                                    className: "placeholder",
                                };
                            } else {
                                return { colSpan: 0 };
                            }
                        }
                        return { className, style: { minWidth } };
                    };

                    result.onHeaderCell = () => ({
                        className,
                        style: { minWidth },
                    });

                    return result;
                }
            );

            result.push({
                key: "rowActions",
                fixed: "right",
                render(value, row) {
                    if (isPlaceholder(row)) return <></>;
                    const actions = rowActionsObj;
                    return <RowActions {...{ row, store, actions }} />;
                },
                onCell(row) {
                    if (isPlaceholder(row)) return { colSpan: 0 };
                    return { className: "row-actions shrink" };
                },
                onHeaderCell() {
                    return { className: "row-actions shrink" };
                },
            });

            return result;
        }, [columns, placeholder]);

        return (
            <Table
                dataSource={rows}
                columns={tableColumns}
                {...{className, size, ...tableProps}}
            />
        );
    }
);
