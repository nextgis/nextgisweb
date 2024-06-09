import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { InputNumber, InputValue } from "@nextgisweb/gui/antd";
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
import { generateResourceKeyname } from "@nextgisweb/resource/util/generateResourceKeyname";

import { Layer } from "./Layer";
import type { ServiceStore } from "./ServiceStore";

const LayerWidget = observer<{
    item: Layer;
}>(function GroupComponentBase({ item }) {
    return (
        <Area pad>
            <LotMV
                label={gettext("Display name")}
                value={item.displayName}
                component={InputValue}
            />
            <LotMV
                label={gettext("Keyname")}
                value={item.keyname}
                component={InputValue}
            />
            <LotMV
                label={gettext("Features per request")}
                value={item.maxFeatures}
                component={InputNumber}
                props={{
                    ...{ min: 0, step: 1000, max: 1000000 },
                    placeholder: gettext("Not set"),
                    style: { width: "12em" },
                }}
            />
            <LotMV
                label={gettext("Resource")}
                value={item.resourceId}
                component={ResourceSelect}
                props={{ readOnly: true }}
            />
        </Area>
    );
});

export const ServiceWidget: EditorWidgetComponent<
    EditorWidgetProps<ServiceStore>
> = observer(({ store }: EditorWidgetProps<ServiceStore>) => {
    const { tableActions, itemActions } = useMemo<
        FocusTablePropsActions<Layer>
    >(
        () => ({
            tableActions: [
                pickToFocusTable(
                    (res) =>
                        new Layer(store, {
                            resource_id: res.resource.id,
                            display_name: res.resource.display_name,
                            keyname: generateResourceKeyname(res.resource),
                            maxfeatures: 1000,
                        }),
                    {
                        pickerOptions: {
                            requireInterface: "IFeatureLayer",
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
        <FocusTable<Layer>
            store={store}
            title={(item) => item.displayName.value}
            columns={[
                {
                    render: (l: Layer) => l.keyname.value,
                    width: ["25%", "50%"],
                },
            ]}
            tableActions={tableActions}
            itemActions={itemActions}
            renderDetail={({ item }) => <LayerWidget item={item} />}
        />
    );
});

ServiceWidget.title = gettext("WFS service");
ServiceWidget.activateOn = { create: true };
ServiceWidget.order = -50;
