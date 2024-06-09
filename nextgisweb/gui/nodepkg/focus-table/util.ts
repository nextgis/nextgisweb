import { intercept, observable, runInAction } from "mobx";
import type { IObservableArray } from "mobx";

import type { FocusTableItem, FocusTableStore } from "./type";

export function observableChildren<I extends FocusTableItem>(
    parent: I | null,
    pname: keyof I
): IObservableArray<I> {
    const result = observable.array<I>([]);
    // TODO: Is it OK not to dispose an interception?
    intercept(result, (change) => {
        if (change.type === "splice") {
            change.added.forEach((item: I) => {
                // FIXME: How can I tell TS that I[pname] accepts I | null?
                if (item[pname] !== parent) (item[pname] as I | null) = parent;
            });
        }
        return change;
    });
    return result;
}

export function placeItem<I extends FocusTableItem>(
    store: FocusTableStore<I>,
    item: I,
    base: I | null = null,
    into: boolean = false
): I {
    let parent: I | null;
    let container: IObservableArray<I>;
    let position: number;

    const children = store.getItemChildren(base);
    if (children !== undefined && (base === null || into)) {
        parent = base;
        container = store.getItemChildren(base) as IObservableArray<I>;
        position = container.length;
    } else {
        parent = store.getItemParent(base as I);
        container = store.getItemChildren(parent) as IObservableArray<I>;
        position = container.indexOf(base as I) + 1;
    }

    runInAction(() => container.splice(position, 0, item));
    return item;
}

export function deleteItem<I extends FocusTableItem>(
    store: FocusTableStore<I>,
    item: I
): I | null {
    const collection = store.getItemContainer(item);
    const idx = collection.indexOf(item);
    if (idx < 0) throw Error("Item not found");

    const traverse = (parent: I) => {
        const cnt = store.getItemChildren(parent);
        if (cnt === undefined) return;
        cnt.forEach((item) => traverse(item));
        cnt.splice(0);
    };

    runInAction(() => {
        traverse(item);
        collection.splice(idx, 1);
    });

    let next: I | undefined = collection[idx];
    if (!next) next = collection.slice(-1)[0];
    if (!next && parent) next = store.getItemParent(item) || undefined;
    return next || null;
}
