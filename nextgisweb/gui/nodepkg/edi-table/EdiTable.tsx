import type { AnyObject } from "antd/es/_util/type";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Table } from "../antd";
import type { TableProps } from "../antd";

import type { EdiTableStore } from "./EdiTableStore";
import { RowActions, WELLKNOWN_ROW_ACTIONS } from "./RowAction";
import type { RowAction, RowActionConfig } from "./RowAction";
import type { AntTableCollumn, EdiTableColumn, FunctionKeys } from "./type";

import "./EdiTable.less";

export interface EdiTableProps<
    S extends EdiTableStore,
    R extends AnyObject = AnyObject,
    T = FunctionKeys<S>,
> extends Omit<TableProps, "columns"> {
    rowActions?: T[] | RowActionConfig<T>[] | RowAction<R>[];
    store: S;
    columns: EdiTableColumn<R>[];
}

interface RowActionTemp {
    key: string;
    callback: FunctionKeys<EdiTableStore> | ((row: AnyObject) => void);
    title: string;
    icon: React.ReactNode;
}

const DEFAULT_ROW_ACTIONS = Object.keys(
    WELLKNOWN_ROW_ACTIONS
) as FunctionKeys<EdiTableStore>[];

function EdiTableComponent<R extends AnyObject = AnyObject>({
    store,
    columns,
    className,
    rowActions = DEFAULT_ROW_ACTIONS,
    size = "small",
    ...tableProps
}: EdiTableProps<EdiTableStore<R>, R>) {
    className = (className ? className + " " : "") + "ngw-gui-edi-table";

    const rows = [...store.rows];
    const placeholder = store.placeholder;
    placeholder && rows.push(placeholder);

    const rowActionsObj = useMemo(() => {
        const result: RowAction[] = [];
        for (const actOrKey of rowActions) {
            const actConfig: RowActionTemp =
                typeof actOrKey === "string"
                    ? {
                          key: actOrKey,
                          ...WELLKNOWN_ROW_ACTIONS[actOrKey],
                      }
                    : (actOrKey as RowAction);

            let act: RowAction;

            if (typeof actConfig.callback === "string") {
                const storeCbKey = actConfig.callback;
                const catCallback = store[storeCbKey];

                if (typeof catCallback !== "function") continue;
                act = { ...actConfig, callback: catCallback };
                act.callback = act.callback.bind(store);
            } else {
                act = actConfig as RowAction;
            }

            result.push(act);
        }
        return result;
    }, [store, rowActions]);

    const tableColumns = useMemo(() => {
        const isPlaceholder = (row: unknown) => row === placeholder;
        const results: NonNullable<TableProps["columns"]> = columns.map(
            ({ key, className, component, shrink, ...columnProps }, idx) => {
                className = className ? className : String(key);
                if (shrink) className += " shrink";
                const minWidth = shrink !== true ? shrink : undefined;

                const result: AntTableCollumn = {
                    key,
                    dataIndex: String(key),
                    ...columnProps,
                };

                if (component) {
                    const Component = component;
                    result.render = (value, row) => (
                        <Component
                            value={value}
                            row={row}
                            placeholder={isPlaceholder(row)}
                        />
                    );
                }

                const style = minWidth ? { style: { minWidth } } : {};

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
                    return {
                        className,
                        ...style,
                    };
                };

                result.onHeaderCell = () => ({
                    className,
                    ...style,
                });

                return result;
            }
        );

        results.push({
            key: "rowActions",
            fixed: "right",
            render(_, row) {
                if (isPlaceholder(row)) return <></>;
                return (
                    <RowActions
                        row={row}
                        store={store}
                        actions={rowActionsObj}
                    />
                );
            },
            onCell(row) {
                if (isPlaceholder(row)) return { colSpan: 0 };
                return { className: "row-actions shrink" };
            },
            onHeaderCell() {
                return { className: "row-actions shrink" };
            },
        });

        return results;
    }, [columns, placeholder, rowActionsObj, store]);

    return (
        <Table
            dataSource={rows}
            columns={tableColumns}
            size={size}
            className={className}
            {...tableProps}
        />
    );
}

export const EdiTable = observer(EdiTableComponent);
