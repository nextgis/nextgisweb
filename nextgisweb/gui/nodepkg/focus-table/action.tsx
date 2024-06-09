import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FocusTableAction, FocusTableItem } from "./type";
import * as util from "./util";

import AddIcon from "@nextgisweb/icon/material/add_circle_outline";
import DeleteIcon from "@nextgisweb/icon/material/close";

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
        icon: <DeleteIcon />,
        callback: (item, { selected, select, store }) => {
            const next = util.deleteItem(store, item);
            if (selected === item) select(next);
        },
    };
}
