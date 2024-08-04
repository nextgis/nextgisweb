import { AddIcon, RemoveIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FocusTableAction, FocusTableItem } from "./type";
import * as util from "./util";

export function addItem<I extends FocusTableItem, S extends I>(
    factory: () => S,
    options?: Partial<Omit<FocusTableAction<I | null>, "callback">>
): FocusTableAction<I | null> {
    return {
        key: "add",
        title: gettext("Add"),
        icon: <AddIcon />,
        ...options,
        callback: (base, { store, select, isExpanded }) => {
            const item = factory();
            util.placeItem(store, item, base, isExpanded(base));
            select(item);
        },
    };
}

export function deleteItem<I extends FocusTableItem>(): FocusTableAction<I> {
    return {
        key: "delete",
        title: gettext("Delete"),
        icon: <RemoveIcon />,
        placement: "right",
        danger: true,
        callback: (item, { selected, select, store }) => {
            const next = util.deleteItem(store, item);
            if (selected === item) select(next);
        },
    };
}
