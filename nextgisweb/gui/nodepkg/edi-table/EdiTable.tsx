import type { AnyObject } from "antd/es/_util/type";
import { observer } from "mobx-react-lite";
import { createElement, useCallback, useMemo } from "react";

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

const DEFAULT_ROW_ACTIONS = Object.keys(
    WELLKNOWN_ROW_ACTIONS
) as FunctionKeys<EdiTableStore>[];

function EdiTableComponent<R extends AnyObject = AnyObject>({
    store,
    columns,
    rowActions = DEFAULT_ROW_ACTIONS,
    className,
    size = "small",
    ...tableProps
}: EdiTableProps<EdiTableStore<R>, R>) {
    className = (className ? className + " " : "") + "ngw-gui-edi-table";

    const renderActs = useCallback(
        (row: R) => {
            const actions: RowAction[] = [];
            for (const actOrKey of rowActions) {
                const actConfig =
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
                    act = actConfig;
                }

                actions.push(act);
            }
            return <RowActions {...{ row, actions, store }} />;
        },
        [store, rowActions]
    );

    const tableDataSource = [...store.rows];

    // There is no way to append a placeholder row by overriding components
    // property. It works in general, but looses focus on inputs. So we add
    // placeholders to rows and customize rendering via hooks.
    store.placeholder && tableDataSource.push(store.placeholder);

    const tableColumns = useMemo(() => {
        const isPlaceholder = (row: unknown) => row === store.placeholder;
        const actsCell = { className: "row-actions" };
        const hideCell = { colSpan: 0 };
        const placeholderCell = {
            colSpan: columns.length + 1,
            className: "placeholder",
        };

        return columns
            .map(({ key, component, shrink, ...columnProps }, idx) => {
                const result: AntTableCollumn = {
                    key,
                    dataIndex: String(key),
                    ...columnProps,
                };

                let className = columnProps.className || String(key);
                const style: React.CSSProperties = {};
                if (shrink) {
                    className += " shrink";
                    if (shrink !== true) style.minWidth = shrink;
                }

                result.onHeaderCell = () => ({ className, ...{ style } });
                result.onCell = (row) => {
                    if (isPlaceholder(row)) {
                        return idx === 0 ? placeholderCell : hideCell;
                    }
                    return { className, ...{ style } };
                };

                if (component) {
                    result.render = (value, row) =>
                        createElement(component, {
                            ...{ value, row },
                            placeholder: idx === 0 && isPlaceholder(row),
                        });
                }

                return result;
            })
            .concat([
                {
                    key: "rowActions",
                    fixed: "right",
                    onHeaderCell: () => actsCell,
                    onCell: (row) => (isPlaceholder(row) ? hideCell : actsCell),
                    render: (_, row) => renderActs(row),
                },
            ]);
    }, [store, columns, renderActs]);

    return (
        <Table
            dataSource={tableDataSource}
            columns={tableColumns}
            className={className}
            size={size}
            {...tableProps}
        />
    );
}

export const EdiTable = observer(EdiTableComponent);
