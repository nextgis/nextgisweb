import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import {
    createContext,
    createElement,
    useCallback,
    useContext,
    useMemo,
} from "react";
import type { CSSProperties, FC, HTMLAttributes } from "react";

import { Button, Table } from "../antd";
import type { TableColumnType, TableProps } from "../antd";

import type { EdiTableStore } from "./EdiTableStore";
import { RowActions, WELLKNOWN_ROW_ACTIONS } from "./RowAction";
import type { RowAction, RowActionConfig } from "./RowAction";
import type { AnyObject, EdiTableColumn, FunctionKeys } from "./type";

import { HolderOutlined } from "@ant-design/icons";

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

interface RowContextProps {
    setActivatorNodeRef?: (element: HTMLElement | null) => void;
    listeners?: SyntheticListenerMap;
}

const RowContext = createContext<RowContextProps>({});

const DragHandle: FC = () => {
    const { setActivatorNodeRef, listeners } = useContext(RowContext);
    return (
        <Button
            type="text"
            size="small"
            icon={<HolderOutlined />}
            style={{ cursor: "move" }}
            ref={setActivatorNodeRef}
            {...listeners}
        />
    );
};

const RowComp: FC<
    HTMLAttributes<HTMLTableRowElement> & { "data-row-key": string }
> = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props["data-row-key"] });

    const style: CSSProperties = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? { position: "relative", zIndex: 9999 } : {}),
    };

    const contextValue = useMemo<RowContextProps>(
        () => ({ setActivatorNodeRef, listeners }),
        [setActivatorNodeRef, listeners]
    );

    return (
        <RowContext.Provider value={contextValue}>
            <tr {...props} ref={setNodeRef} style={style} {...attributes} />
        </RowContext.Provider>
    );
};

export const EdiTable = observer(
    <R extends AnyObject = AnyObject>({
        store,
        columns,
        rowActions = DEFAULT_ROW_ACTIONS,
        className,
        size = "small",
        rowKey = "key",
        ...tableProps
    }: EdiTableProps<EdiTableStore<R>, R>) => {
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

        const onDragEnd = ({ active, over }: DragEndEvent) => {
            if (active && over && active.id !== over.id) {
                const row = store.rows.find(
                    (row) => row[rowKey as string] === active.id
                );
                const overIndex = store.rows.findIndex(
                    (record) => record[rowKey as string] === over.id
                );
                if (row && overIndex !== -1 && store.moveRow) {
                    store.moveRow(row, overIndex);
                }
            }
        };

        const tableColumns: TableColumnType<R>[] = useMemo(() => {
            const isPlaceholder = (row: R) => row === store.placeholder;
            const actsCell = { className: "row-actions" };
            const hideCell = { colSpan: 0 };
            const placeholderCell = {
                colSpan: columns.length + 1 + (store.moveRow ? 1 : 0),
                className: "placeholder",
            };

            const resultColumns: TableColumnType<R>[] = [
                ...columns.map(
                    ({ key, component, shrink, ...columnProps }, idx) => {
                        const result: TableColumnType = {
                            key,
                            dataIndex: String(key),
                            ...columnProps,
                        };

                        const className = classNames(
                            columnProps.className || String(key),
                            { "shrink": shrink }
                        );

                        const style: CSSProperties = {};
                        if (shrink && shrink !== true) {
                            style.minWidth = shrink;
                        }

                        const moveSpan = idx === 0 && store.moveRow;
                        result.onHeaderCell = () => ({
                            className,
                            colSpan: moveSpan ? 2 : 1,
                            style: {
                                // Antd sets center align for spanned cells
                                textAlign: moveSpan ? "start" : undefined,
                                ...style,
                            },
                        });

                        result.onCell = (row: R) => {
                            if (isPlaceholder(row)) {
                                return idx === 0 ? placeholderCell : hideCell;
                            }
                            return { className, ...{ style } };
                        };

                        if (component) {
                            result.render = (value, row) =>
                                createElement(component, {
                                    ...{ value, row },
                                    placeholder:
                                        idx === 0 && isPlaceholder(row),
                                });
                        }

                        return result;
                    }
                ),
                {
                    key: "rowActions",
                    fixed: "right",
                    onHeaderCell: () => actsCell,
                    onCell: (row: R) =>
                        isPlaceholder(row) ? hideCell : actsCell,
                    render: (_: any, row: R) => renderActs(row),
                },
            ];

            if (store.moveRow) {
                resultColumns.unshift({
                    key: "sort",
                    onHeaderCell: () => hideCell,
                    onCell: (row: R) =>
                        !isPlaceholder(row)
                            ? { className: "row-handle" }
                            : hideCell,
                    render: () => <DragHandle />,
                });
            }

            return resultColumns;
        }, [store, columns, renderActs]);

        return (
            <DndContext
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={onDragEnd}
            >
                <SortableContext
                    items={store.rows.map((row: R) => row[rowKey as string])}
                    strategy={verticalListSortingStrategy}
                >
                    <Table
                        className={classNames("ngw-gui-edi-table", className)}
                        dataSource={tableDataSource}
                        columns={tableColumns}
                        size={size}
                        rowKey={rowKey}
                        components={{
                            body: {
                                row: RowComp,
                            },
                        }}
                        {...tableProps}
                    />
                </SortableContext>
            </DndContext>
        );
    }
);

EdiTable.displayName = "EdiTable";
