import { partition } from "lodash-es";
import type { RefObject } from "react";

import { ActionToolbar } from "../action-toolbar";
import type { ButtonProps } from "../antd";

import type { ComplexTreeEnvironment } from "./ComplexTree";
import type { FocusTableAction, FocusTableItem } from "./type";

function atActions<I extends FocusTableItem | null>(
    items: FocusTableAction<I>[],
    selected: I,
    environmentRef: RefObject<ComplexTreeEnvironment<NonNullable<I>>>
) {
    return items.map(
        ({ callback, ...props }): ButtonProps => ({
            type: "text",
            onClick: () => callback(selected, environmentRef.current!),
            ...props,
        })
    );
}

export interface FocusToolbarProps<I extends FocusTableItem | null> {
    environmentRef: RefObject<ComplexTreeEnvironment<NonNullable<I>>>;
    actions: FocusTableAction<I>[];
    selected: I;
    hideEmpty?: boolean;
}

export function FocusToolbar<I extends FocusTableItem | null>({
    environmentRef,
    actions,
    selected,
    hideEmpty = false,
}: FocusToolbarProps<I>) {
    if (hideEmpty && actions.length === 0) return <></>;
    const [start, end] = partition(actions, (i) => i.placement !== "right");
    return (
        <ActionToolbar
            actions={atActions<I>(start, selected, environmentRef)}
            rightActions={atActions<I>(end, selected, environmentRef)}
            borderBlockEnd
        />
    );
}
