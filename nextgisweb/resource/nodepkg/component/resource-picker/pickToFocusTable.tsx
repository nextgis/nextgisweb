import { placeItem } from "@nextgisweb/gui/focus-table";
import type {
  FocusTableAction,
  FocusTableItem,
  FocusTableStore,
} from "@nextgisweb/gui/focus-table";
import { AddIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { showResourcePicker } from "./showResourcePicker";
import type { ResourcePickerAttr, ResourcePickerStoreOptions } from "./type";

export interface PickToFocusTableOptions<I> extends Partial<
  Omit<FocusTableAction<I>, "callback">
> {
  pickerOptions?: ResourcePickerStoreOptions;
}

export function pickToFocusTable<I extends FocusTableItem>(
  factory: (resource: ResourcePickerAttr) => I | Promise<I>,
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

      onPick: async (resources) => {
        if (!Array.isArray(resources)) resources = [resources];

        for (const res of resources) {
          const item = await factory(res);
          if (item) {
            base = placeItem(env.store, item, base);
            if (base) {
              env.select(base);
            }
          }
        }
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
