import showModalLazy from "@nextgisweb/gui/showModalLazy";

import type { ResourcePickerModalProps, SelectValue } from "./type";

export function showResourcePicker<V extends SelectValue = SelectValue>(
    params: ResourcePickerModalProps<V>
) {
    return showModalLazy(
        () => import("./ResourcePickerModal"),
        params as ResourcePickerModalProps<SelectValue>
    );
}
