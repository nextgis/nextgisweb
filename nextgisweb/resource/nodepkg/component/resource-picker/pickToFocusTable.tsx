import { placeItem } from "@nextgisweb/gui/focus-table";
import type {
    FocusTableAction,
    FocusTableItem,
    FocusTableStore,
} from "@nextgisweb/gui/focus-table";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import { showResourcePicker } from "./showResourcePicker";
import type { ResourcePickerStoreOptions } from "./type";

import AddIcon from "@nextgisweb/icon/material/add_circle_outline";

interface PickToFocusTableOptions<I>
    extends Partial<Omit<FocusTableAction<I>, "callback">> {
    pickerOptions?: ResourcePickerStoreOptions;
}

export function pickToFocusTable<I extends FocusTableItem>(
    factory: (resource: CompositeRead) => I,
    options?: PickToFocusTableOptions<I | null>
): FocusTableAction<I | null> {
    const { pickerOptions, ...restOptions } = options || {};

    const callback = (
        base: I | null,
        env: { store: FocusTableStore<I>; select: (item: I) => void }
    ) => {
        showResourcePicker({
            pickerOptions,
            onPick: (resources) => {
                if (!Array.isArray(resources)) resources = [resources];
                for (const res of resources) {
                    base = placeItem(env.store, factory(res), base);
                }
                base && env.select(base);
            },
        });
    };

    return {
        key: "add",
        title: gettext("Add"),
        icon: <AddIcon />,
        ...restOptions,
        callback,
    };
}
