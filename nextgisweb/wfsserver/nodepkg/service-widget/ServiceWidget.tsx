import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/field/ResourceSelect";
import { ResourceTreeDetail } from "@nextgisweb/resource/resource-tree-detail";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";
import { generateResourceKeyname } from "@nextgisweb/resource/util/generateResourceKeyname";

import type { ServiceStore } from "./ServiceStore";
import type { WfsServiceLayer } from "./type";
import "./ServiceWidget.less";

export const ServiceWidget: EditorWidgetComponent<
    EditorWidgetProps<ServiceStore>
> = observer(({ store }: EditorWidgetProps<ServiceStore>) => {
    const getItemForm = useCallback((): FormField[] => {
        return [
            {
                name: "display_name",
                label: gettext("Display name"),
            },
            { name: "keyname", label: gettext("Keyname") },
            {
                name: "maxfeatures",
                label: gettext("Default count of returned features"),
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
            <ResourceTreeDetail<WfsServiceLayer>
                pickerOptions={{
                    requireInterface: "IFeatureLayer",
                    parentId: store.parentId,
                }}
                titleField="display_name"
                getItemFields={getItemForm}
                onAddTreeItem={(item) => {
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
            ></ResourceTreeDetail>
        </div>
    );
});

ServiceWidget.title = gettext("WFS service");
ServiceWidget.activateOn = { create: true };
ServiceWidget.order = -50;
