import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { CheckboxValue, InputValue } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { InputOpacity } from "@nextgisweb/gui/component";
import { FocusTable, action } from "@nextgisweb/gui/focus-table";
import type { FocusTablePropsActions } from "@nextgisweb/gui/focus-table";
import { Area } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/component";
import { useFocusTablePicker } from "@nextgisweb/resource/component/resource-picker";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import { Basemap } from "./Basemap";
import type { WebMapStore } from "./WebMapStore";

const BasemapWidget = observer<{
    item: Basemap;
}>(({ item }) => {
    return (
        <Area pad>
            <LotMV
                label={gettext("Display name")}
                value={item.displayName}
                component={InputValue}
            />
            <LotMV
                value={item.enabled}
                component={CheckboxValue}
                props={{ children: gettext("Default basemap") }}
            />
            <LotMV
                label={gettext("Opacity")}
                value={item.opacity}
                component={InputOpacity}
            />
            <LotMV
                label={gettext("Resource")}
                value={item.resourceId}
                component={ResourceSelect}
                props={{
                    readOnly: true,
                    style: { width: "100%" },
                    pickerOptions: {
                        initParentId: item.store.composite.parent,
                    },
                }}
            />
        </Area>
    );
});

BasemapWidget.displayName = "BasemapWidget";

export const WebMapWidget: EditorWidgetComponent<
    EditorWidgetProps<WebMapStore>
> = observer(({ store }: EditorWidgetProps<WebMapStore>) => {
    const { pickToFocusTable } = useFocusTablePicker({
        initParentId: store.composite.parent || undefined,
    });

    const { tableActions, itemActions } = useMemo<
        FocusTablePropsActions<Basemap>
    >(
        () => ({
            tableActions: [
                pickToFocusTable(
                    (res) => {
                        return new Basemap(store, {
                            resource_id: res.resource.id,
                            display_name: res.resource.display_name,
                            enabled: !store.basemaps.some(
                                (i) => i.enabled.value
                            ),
                            opacity: null,
                        });
                    },
                    {
                        pickerOptions: {
                            requireClass: "basemap_layer",
                            multiple: true,
                        },
                    }
                ),
            ],
            itemActions: [action.deleteItem()],
        }),
        [pickToFocusTable, store]
    );

    return (
        <FocusTable<Basemap>
            store={store}
            title={(item) => item.displayName.value}
            columns={[]}
            tableActions={tableActions}
            itemActions={itemActions}
            renderDetail={({ item }) => <BasemapWidget item={item} />}
        />
    );
});

WebMapWidget.displayName = "WebMapWidget";
WebMapWidget.title = gettext("Basemaps");
