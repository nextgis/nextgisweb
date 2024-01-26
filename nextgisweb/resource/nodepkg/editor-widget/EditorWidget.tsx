import { observer } from "mobx-react-lite";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { Input } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/component";

import type { EditorWidgetComponent, EditorWidgetProps } from "../type";

import type { EditorStore } from "./EditorStore";

import "./EditorWidget.less";

export const EditorWidget: EditorWidgetComponent<
    EditorWidgetProps<EditorStore>
> = observer(({ store }) => {
    return (
        <div className="ngw-resource-editor-widget">
            <label>{gettext("Display name")}</label>
            <Input
                value={store.displayName || undefined}
                placeholder={store.sdnDynamic || store.sdnBase || undefined}
                onChange={(e) => {
                    store.displayName = e.target.value;
                }}
                status={store.displayNameIsValid ? undefined : "error"}
            />

            <label>{gettext("Parent")}</label>
            <ResourceSelect
                value={store.parent || undefined}
                onChange={(v) => {
                    store.parent = typeof v === "number" ? v : null;
                }}
                allowClear={false}
                disabled={store.operation === "create"}
            />

            <label>{gettext("Owner")}</label>
            <PrincipalSelect
                model={"user"}
                systemUsers={["guest"]}
                value={store.ownerUser || undefined}
                onChange={(v) => {
                    store.ownerUser = v as number;
                }}
                allowClear={false}
                disabled={!ngwConfig.isAdministrator}
            />

            <label>{gettext("Keyname")}</label>
            <Input
                value={store.keyname || ""}
                status={store.keynameIsValid ? undefined : "error"}
                placeholder={gettext(
                    "Identifier for API integration (optional)"
                )}
                onChange={(e) => {
                    store.keyname = e.target.value;
                }}
                allowClear
            />
        </div>
    );
});

EditorWidget.title = gettext("Resource");
EditorWidget.order = -100;
