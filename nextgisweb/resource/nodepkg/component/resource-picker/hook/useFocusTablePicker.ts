import { useCallback } from "react";

import type { FocusTableItem } from "@nextgisweb/gui/focus-table";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import { useResourcePicker } from "../../resource-select/hook/useResourcePicker";
import type { ResourcePickerHookProps } from "../../resource-select/hook/useResourcePicker";
import { pickToFocusTable as pickToFocusTableOriginal } from "../pickToFocusTable";
import type { PickToFocusTableOptions } from "../pickToFocusTable";

export function useFocusTablePicker(props?: ResourcePickerHookProps) {
    const { showResourcePicker } = useResourcePicker(props);

    const pickToFocusTable = useCallback(
        <I extends FocusTableItem>(
            factory: (resource: CompositeRead) => I | Promise<I>,
            options?: PickToFocusTableOptions<I | null>
        ) => pickToFocusTableOriginal(factory, options, showResourcePicker),
        [showResourcePicker]
    );

    return {
        pickToFocusTable,
    };
}
