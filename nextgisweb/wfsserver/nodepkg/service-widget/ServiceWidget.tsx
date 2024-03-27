import { useMemo } from "react";
import { observer } from "mobx-react-lite";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceTreeDetail } from "@nextgisweb/resource/resource-tree-detail";

import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";
import type { ServiceStore } from "./ServiceStore";

import "./ServiceWidget.less";

export const ServiceWidget: EditorWidgetComponent<
    EditorWidgetProps<ServiceStore>
> = observer(({ store }: EditorWidgetProps<ServiceStore>) => {
    return (
        <div className="ngw-wfsserver-widget">
            <ResourceTreeDetail></ResourceTreeDetail>
        </div>
    );
});

ServiceWidget.title = gettext("WFS service");
ServiceWidget.activateOn = { create: true };
ServiceWidget.order = -50;
