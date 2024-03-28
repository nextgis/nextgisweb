import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import type { GetItemFieldsFunction } from "@nextgisweb/gui/focus-table";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/field/ResourceSelect";
import { ResourceFocusTable } from "@nextgisweb/resource/resource-focus-table";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";
import { generateResourceKeyname } from "@nextgisweb/resource/util/generateResourceKeyname";

import type { ServiceStore } from "./ServiceStore";
import type { WfsServiceLayer } from "./type";

export const ServiceWidget: EditorWidgetComponent<
    EditorWidgetProps<ServiceStore>
> = observer(({ store }: EditorWidgetProps<ServiceStore>) => {
    const getItemFields = useCallback<
        GetItemFieldsFunction<WfsServiceLayer>
    >(() => {
        return [
            {
                name: "display_name",
                label: gettext("Display name"),
                tableView: false,
            },
            { name: "keyname", label: gettext("Keyname") },
            {
                name: "maxfeatures",
                label: gettext("Default count of returned features"),
                widget: "number",
            },
            {
                name: "resource_id",
                label: gettext("Resource"),
                widget: ResourceSelect,
                inputProps: {
                    readOnly: true,
                },
            },
        ];
    }, []);

    if (!store.isLoaded) {
        return <LoadingWrapper />;
    }

    return (
        <div className="ngw-wfsserver-widget">
            <ResourceFocusTable<WfsServiceLayer>
                pickerOptions={{
                    requireInterface: "IFeatureLayer",
                    parentId: store.parentId,
                }}
                titleField="display_name"
                getItemFields={getItemFields}
                onResourceAdd={(item) => {
                    const keyname = generateResourceKeyname(item.resource);

                    return {
                        display_name: item.resource.display_name,
                        keyname,
                        resource_id: item.resource.id,
                        maxfeatures: 1000,
                    };
                }}
                initValue={store.initValue ? store.initValue.layers : []}
                onChange={(layers) => {
                    store.setValue({ layers });
                }}
                disableGroups
            ></ResourceFocusTable>
        </div>
    );
});

ServiceWidget.title = gettext("WFS service");
ServiceWidget.activateOn = { create: true };
ServiceWidget.order = -50;
