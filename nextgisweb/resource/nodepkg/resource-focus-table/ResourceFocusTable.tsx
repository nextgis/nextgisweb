import { observer } from "mobx-react-lite";
import { useState } from "react";

import { FocusTable } from "@nextgisweb/gui/focus-table";
import type { TreeItemData } from "@nextgisweb/gui/focus-table";
import type { FocusTableProps } from "@nextgisweb/gui/focus-table/FocusTable";
import { FocusTableStore } from "@nextgisweb/gui/focus-table/FocusTableStore";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { ResourcePickerStoreOptions } from "../component/resource-picker/type";

import { ResourceFocusTableActions } from "./ResourceFocusTableActions";

interface ResourceFocusTableProps<V extends TreeItemData = TreeItemData>
    extends FocusTableProps<V> {
    pickerOptions?: Partial<ResourcePickerStoreOptions>;

    onResourceAdd?: (item: CompositeRead) => V;
}

export const ResourceFocusTable = observer(
    <V extends TreeItemData = TreeItemData>({
        size,
        initValue,
        titleField = "display_name",
        canDeleteItem = true,
        pickerOptions,
        disableGroups,
        onResourceAdd,
        getItemFields,
        onChange,
    }: ResourceFocusTableProps<V>) => {
        const [store] = useState(
            () =>
                new FocusTableStore({
                    size,
                    initValue,
                    titleField,
                    disableGroups,
                    canDeleteItem,
                    getItemFields,
                    onChange,
                })
        );

        return (
            <>
                <FocusTable
                    store={store}
                    table={{
                        header: (
                            <ResourceFocusTableActions
                                store={store}
                                pickerOptions={pickerOptions}
                                onResourceAdd={onResourceAdd}
                            />
                        ),
                    }}
                />
            </>
        );
    }
);
