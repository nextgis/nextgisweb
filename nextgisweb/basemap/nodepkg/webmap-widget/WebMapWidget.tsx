import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { CheckboxValue, InputNumber, InputValue } from "@nextgisweb/gui/antd";
import type { InputNumberProps } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { FocusTable, action } from "@nextgisweb/gui/focus-table";
import type { FocusTablePropsActions } from "@nextgisweb/gui/focus-table";
import { Area } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/component";
import { pickToFocusTable } from "@nextgisweb/resource/component/resource-picker";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import { Basemap } from "./Basemap";
import type { WebMapStore } from "./WebMapStore";

function opacityFormatter(
    value: number | string | undefined,
    { userTyping, input }: { userTyping: boolean; input: string }
) {
    if (userTyping) return input;
    return value ? `${(Number(value) * 100).toFixed(0)} %` : "";
}

function opacityParser(value: string | undefined) {
    if (!value) return "";
    return Number(value.replace(/\s*%$/, "")) / 100;
}

function InputOpacity(props: InputNumberProps) {
    return (
        <InputNumber
            min={0}
            max={1}
            step={0.05}
            formatter={opacityFormatter}
            parser={opacityParser}
            placeholder="100 %"
            {...props}
        />
    );
}

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
                props={{ readOnly: true, style: { width: "100%" } }}
            />
        </Area>
    );
});

BasemapWidget.displayName = "BasemapWidget";

export const WebMapWidget: EditorWidgetComponent<
    EditorWidgetProps<WebMapStore>
> = observer(({ store }: EditorWidgetProps<WebMapStore>) => {
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
        [store]
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
