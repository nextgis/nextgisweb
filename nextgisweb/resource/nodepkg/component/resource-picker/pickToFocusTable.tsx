import { placeItem } from "@nextgisweb/gui/focus-table";
import type {
    FocusTableAction,
    FocusTableItem,
    FocusTableStore,
} from "@nextgisweb/gui/focus-table";
import { AddIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import { showResourcePicker } from "./showResourcePicker";
import type { ResourcePickerStoreOptions } from "./type";

export interface PickToFocusTableOptions<I> extends Partial<
    Omit<FocusTableAction<I>, "callback">
> {
    pickerOptions?: ResourcePickerStoreOptions;
}

export function pickToFocusTable<I extends FocusTableItem>(
    factory: (resource: CompositeRead) => I | Promise<I>,
    options?: PickToFocusTableOptions<I | null>,
    showResourcePickerFunction = showResourcePicker
): FocusTableAction<I | null> {
    const { pickerOptions, ...restOptions } = options || {};

    const callback = (
        base: I | null,
        env: { store: FocusTableStore<I>; select: (item: I) => void }
    ) => {
        showResourcePickerFunction({
            pickerOptions: { ...pickerOptions },

            onPick: (resources) => {
                if (!Array.isArray(resources)) resources = [resources];
                Promise.all(resources.map((res) => factory(res))).then(
                    (items) => {
                        for (const item of items) {
                            base = placeItem(env.store, item, base);
                        }
                        if (base) {
                            env.select(base);
                        }
                    }
                );
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
