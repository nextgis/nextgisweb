import { Fragment, useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Button } from "@nextgisweb/gui/antd";
import { mergeClasses } from "@nextgisweb/gui/util";

import { ComplexTree } from "./ComplexTree";
import type { ComplexTreeEnvironment, ComplexTreeProps } from "./ComplexTree";
import { ROOT_ITEM } from "./DataProvider";
import { useActionsCallback } from "./hook";
import type {
    FocusTableActions,
    FocusTableItem,
    FocusTableStore,
} from "./type";

import HideDetailIcon from "@nextgisweb/icon/material/arrow_forward";

import "./FocusTable.less";

export interface FocusTablePropsActions<I extends FocusTableItem> {
    tableActions?: FocusTableActions<
        I | null,
        ComplexTreeEnvironment<I>,
        undefined
    >;
    itemActions?: FocusTableActions<
        I,
        ComplexTreeEnvironment<I>,
        "detail" | "tree"
    >;
}

export interface FocusTableProps<I extends FocusTableItem, C extends string, S>
    extends Pick<
            ComplexTreeProps<I, C, S>,
            "store" | "root" | "title" | "columns"
        >,
        FocusTablePropsActions<I> {
    renderDetail: ({ item }: { item: I }) => ReactNode;
    rootClassName?: string;
}

export function FocusTable<
    I extends FocusTableItem,
    C extends string = string,
    S extends FocusTableStore<I> = FocusTableStore<I>,
>({
    store,
    root = ROOT_ITEM,
    title,
    columns,
    tableActions,
    itemActions,
    renderDetail,
    rootClassName,
}: FocusTableProps<I, C, S>) {
    const environmentRef = useRef<ComplexTreeEnvironment<I>>(null);
    const [selected, setSelected] = useState<I | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    const hideDetail = useCallback(() => {
        setShowDetail(false);
        environmentRef.current?.select(null);
    }, [setShowDetail, environmentRef]);

    const getTableActions = useActionsCallback(tableActions, undefined);
    const getItemActionsDetail = useActionsCallback(itemActions, "detail");
    const getItemActionsTree = useActionsCallback(itemActions, "tree");

    const tableActionsArray = getTableActions(selected);
    const itemActionsArray = selected ? getItemActionsDetail(selected) : [];

    return (
        <div className={mergeClasses("ngw-gui-focus-table", rootClassName)}>
            <div className="table">
                {tableActionsArray.length > 0 && (
                    <ActionToolbar
                        actions={tableActionsArray.map(
                            ({ callback, ...props }) => ({
                                onClick: () =>
                                    callback(selected, environmentRef.current!),
                                ...props,
                            })
                        )}
                    />
                )}
                <div className="items">
                    <ComplexTree<I, C, S>
                        environment={environmentRef}
                        store={store}
                        root={root}
                        title={title}
                        columns={columns}
                        actions={getItemActionsTree}
                        showColumns={!showDetail}
                        showActions={!showDetail}
                        showErrors={true}
                        onSelect={setSelected}
                        onPrimaryAction={() => setShowDetail(true)}
                    />
                </div>
            </div>
            {showDetail && selected && environmentRef.current && (
                <div className="detail">
                    <div className="toolbar">
                        <Button
                            type="default"
                            icon={<HideDetailIcon />}
                            onClick={hideDetail}
                        />
                        {itemActionsArray.length > 0 && (
                            <ActionToolbar
                                actions={itemActionsArray.map(
                                    ({ callback, ...props }) => ({
                                        onClick: () =>
                                            callback(
                                                selected,
                                                environmentRef.current!
                                            ),
                                        ...props,
                                    })
                                )}
                            />
                        )}
                    </div>
                    <Fragment key={environmentRef.current.indexFor(selected)}>
                        {renderDetail({ item: selected })}
                    </Fragment>
                </div>
            )}
        </div>
    );
}
