import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { InputValue } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { InputScaleDenom } from "@nextgisweb/gui/component";
import { FocusTable, action } from "@nextgisweb/gui/focus-table";
import type { FocusTablePropsActions } from "@nextgisweb/gui/focus-table";
import { Area } from "@nextgisweb/gui/mayout";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/component";
import { useFocusTablePicker } from "@nextgisweb/resource/component/resource-picker";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";
import { generateResourceKeyname } from "@nextgisweb/resource/util/generateResourceKeyname";

import { Layer } from "./Layer";
import type { ServiceStore } from "./ServiceStore";

const CollectionWidget = observer<{
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
                label={gettext("Min scale")}
                value={item.minScaleDenom}
                component={InputScaleDenom}
            />
            <LotMV
                label={gettext("Max scale")}
                value={item.maxScaleDenom}
                component={InputScaleDenom}
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

export const ServiceWidget: EditorWidgetComponent<
    EditorWidgetProps<ServiceStore>
> = observer(({ store }: EditorWidgetProps<ServiceStore>) => {
    const { makeSignal } = useAbortController();

    const { pickToFocusTable } = useFocusTablePicker({
        initParentId: store.composite.parent ?? undefined,
    });

    const { tableActions, itemActions } = useMemo<
        FocusTablePropsActions<Layer>
    >(
        () => ({
            tableActions: [
                pickToFocusTable(
                    async (res) => {
                        const resourceId = res.resource.id;
                        if (
                            res.resource.cls.endsWith("_style") &&
                            res.resource.parent
                        ) {
                            res = await route(
                                "resource.item",
                                res.resource.parent?.id
                            ).get({ signal: makeSignal() });
                        }
                        return new Layer(store, {
                            resource_id: resourceId,
                            display_name: res.resource.display_name,
                            keyname: generateResourceKeyname(res.resource),
                            min_scale_denom: null,
                            max_scale_denom: null,
                        });
                    },
                    {
                        pickerOptions: {
                            requireInterface: "IRenderableStyle",
                            multiple: true,
                        },
                    }
                ),
            ],
            itemActions: [action.deleteItem()],
        }),
        [pickToFocusTable, store, makeSignal]
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
            renderDetail={({ item }) => <CollectionWidget item={item} />}
        />
    );
});

ServiceWidget.displayName = "ServiceWidget";
ServiceWidget.title = gettext("WMS service");
ServiceWidget.activateOn = { create: true };
ServiceWidget.order = -50;
