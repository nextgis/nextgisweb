import type { IObservableArray } from "mobx";
import type { ReactNode } from "react";

import type { ComplexTreeEnvironment } from "./ComplexTree";

export type FocusTableItem = NonNullable<unknown>;

export interface FocusTableStore<I extends FocusTableItem> {
    getItemChildren: (item: I | null) => IObservableArray<I> | undefined;
    getItemContainer: (item: I) => IObservableArray<I>;
    getItemParent: (item: I) => I | null;
    getItemError?: (item: I) => string | boolean | undefined;
}

export interface FocusTableAction<
    C,
    E = NonNullable<C> extends FocusTableItem
        ? ComplexTreeEnvironment<NonNullable<C>>
        : never,
> {
    key: string;
    title: string;
    icon?: ReactNode;
    callback: (ctx: C, env: E) => void;
}

export type FocusTableActions<
    C,
    E = NonNullable<C> extends FocusTableItem
        ? ComplexTreeEnvironment<NonNullable<C>>
        : never,
    M = undefined,
> =
    | (
          | FocusTableAction<C, E>
          | ((context: C, modifier: M) => FocusTableAction<C, E>[])
      )[]
    | ((context: C) => FocusTableAction<C, E>[]);
