import { useCallback } from "react";

import type { FocusTableItem } from "@nextgisweb/gui/focus-table";

import { pickToFocusTable as pickToFocusTableOriginal } from "../pickToFocusTable";
import type { PickToFocusTableOptions } from "../pickToFocusTable";
import type { ResourcePickerAttr } from "../type";

import { useResourcePicker } from "./useResourcePicker";
import type { ResourcePickerHookProps } from "./useResourcePicker";

export function useFocusTablePicker(props?: ResourcePickerHookProps) {
    const { showResourcePicker } = useResourcePicker(props);

    const pickToFocusTable = useCallback(
        <I extends FocusTableItem>(
            factory: (resource: ResourcePickerAttr) => I | Promise<I>,
            options?: PickToFocusTableOptions<I | null>
        ) => pickToFocusTableOriginal(factory, options, showResourcePicker),
        [showResourcePicker]
    );

    return {
        pickToFocusTable,
    };
}
