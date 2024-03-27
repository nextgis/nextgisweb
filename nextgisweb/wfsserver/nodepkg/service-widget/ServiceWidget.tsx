import { observer } from "mobx-react-lite";

import type { FormField } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceTreeDetail } from "@nextgisweb/resource/resource-tree-detail";
import type { TreeItem } from "@nextgisweb/resource/resource-tree-detail/type";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { ServiceStore } from "./ServiceStore";

import "./ServiceWidget.less";

export const ServiceWidget: EditorWidgetComponent<
    EditorWidgetProps<ServiceStore>
    // > = observer(({ store }: EditorWidgetProps<ServiceStore>) => {
> = observer(() => {
    const getItemForm = ({ item }: { item: TreeItem }): FormField[] => {
        const resourceItem = item.data.resourceItem;
        if (resourceItem) {
            return [
                { name: "keyname", label: gettext("Keyname") },
                { name: "title", label: gettext("Display name") },
            ];
        } else {
            return [{ name: "title", label: gettext("Display name") }];
        }
    };

    return (
        <div className="ngw-wfsserver-widget">
            <ResourceTreeDetail
                pickerOptions={{ requireInterface: "IFeatureLayer" }}
                getItemForm={getItemForm}
                disableGroups
            ></ResourceTreeDetail>
        </div>
    );
});

ServiceWidget.title = gettext("WFS service");
ServiceWidget.activateOn = { create: true };
ServiceWidget.order = -50;
