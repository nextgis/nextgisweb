import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { InputNumber, InputValue } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
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
import { generateResourceKeyname } from "@nextgisweb/resource/util/generateResourceKeyname";

import { Collection } from "./Collection";
import type { ServiceStore } from "./ServiceStore";

const CollectionWidget = observer<{
    item: Collection;
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
    const { pickToFocusTable } = useFocusTablePicker({
        initParentId: store.composite.parent,
    });

    const { tableActions, itemActions } = useMemo<
        FocusTablePropsActions<Collection>
    >(
        () => ({
            tableActions: [
                pickToFocusTable(
                    (res) =>
                        new Collection(store, {
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
        [pickToFocusTable, store]
    );

    return (
        <FocusTable<Collection>
            store={store}
            title={(item) => item.displayName.value}
            columns={[
                {
                    render: (l: Collection) => l.keyname.value,
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
ServiceWidget.title = gettext("OGC API Features service");
ServiceWidget.activateOn = { create: true };
ServiceWidget.order = -50;
