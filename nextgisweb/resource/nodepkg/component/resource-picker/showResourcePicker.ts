import { lazy } from "react";

import showModal from "@nextgisweb/gui/showModal";

import type { ResourcePickerModalProps, SelectValue } from "./type";

const ResourcePickerModalLazy = lazy(() => import("./ResourcePickerModal"));

export function showResourcePicker<V extends SelectValue = SelectValue>(
    params: ResourcePickerModalProps<V>
) {
    return showModal(
        ResourcePickerModalLazy,
        params as ResourcePickerModalProps<SelectValue>
    );
}
