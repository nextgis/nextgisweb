import classNames from "classnames";
import { Fragment, useMemo, useRef, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { ComplexTree } from "./ComplexTree";
import type { ComplexTreeEnvironment, ComplexTreeProps } from "./ComplexTree";
import { ROOT_ITEM } from "./DataProvider";
import { FocusToolbar } from "./FocusToolbar";
import { useActionsCallback } from "./hook";
import type {
    FocusTableAction,
    FocusTableActions,
    FocusTableItem,
    FocusTableStore,
} from "./type";

import HideDetailsIcon from "@nextgisweb/icon/material/right_panel_close";

import "./FocusTable.less";

const msgHideDetails = gettext("Hide details");

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
    renderDetail: React.ComponentType<{ item: I }>;
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
    renderDetail: Detail,
    rootClassName,
}: FocusTableProps<I, C, S>) {
    const environmentRef = useRef<ComplexTreeEnvironment<I>>(null);
    const [selected, setSelected] = useState<I | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const hideDetail = useMemo((): FocusTableAction<
        I | null,
        ComplexTreeEnvironment<I>
    > => {
        return {
            key: "hide_details",
            title: msgHideDetails,
            icon: <HideDetailsIcon />,
            callback: (_ctx, env) => {
                setShowDetails(false);
                env.select(null);
            },
        };
    }, [setShowDetails]);

    const getTableActions = useActionsCallback(tableActions, undefined);
    const getItemActionsDetail = useActionsCallback(itemActions, "detail");
    const getItemActionsTree = useActionsCallback(itemActions, "tree");

    const tableActionsArray = getTableActions(selected);
    const itemActionsArray = selected ? getItemActionsDetail(selected) : [];

    return (
        <div className={classNames("ngw-gui-focus-table", rootClassName)}>
            <div className="table">
                <FocusToolbar
                    environmentRef={environmentRef}
                    actions={tableActionsArray}
                    selected={selected}
                    hideEmpty
                />
                <div className="items">
                    <ComplexTree<I, C, S>
                        environment={environmentRef}
                        store={store}
                        root={root}
                        title={title}
                        columns={columns}
                        actions={getItemActionsTree}
                        showColumns={!showDetails}
                        showActions={!showDetails}
                        showErrors={true}
                        onSelect={setSelected}
                        onPrimaryAction={() => setShowDetails(true)}
                    />
                </div>
            </div>
            {showDetails && selected && environmentRef.current && (
                <div className="detail">
                    <FocusToolbar
                        actions={[hideDetail, ...itemActionsArray]}
                        environmentRef={environmentRef}
                        selected={selected}
                        hideEmpty
                    />
                    <Fragment key={environmentRef.current.indexFor(selected)}>
                        <Detail item={selected} />
                    </Fragment>
                </div>
            )}
        </div>
    );
}
