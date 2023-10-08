import { observer } from "mobx-react-lite";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { Input } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/component";

import "./EditorWidget.less";

export const EditorWidget = observer(({ store }) => {
    return (
        <div className="ngw-resource-editor-widget">
            <label>{gettext("Display name")}</label>
            <Input
                value={store.displayName}
                placeholder={store.sdnDynamic || store.sdnBase}
                onChange={(e) => {
                    store.displayName = e.target.value;
                }}
                status={store.displayNameIsValid ? undefined : "error"}
            />

            <label>{gettext("Parent")}</label>
            <ResourceSelect
                value={store.parent}
                onChange={(v) => {
                    store.parent = v;
                }}
                allowClear={false}
                disabled={store.operation === "create"}
            />

            <label>{gettext("Owner")}</label>
            <PrincipalSelect
                model={"user"}
                systemUsers={["guest"]}
                value={store.ownerUser}
                onChange={(v) => {
                    store.ownerUser = v;
                }}
                allowClear={false}
                disabled={!ngwConfig.isAdministrator}
            />

            <label>{gettext("Keyname")}</label>
            <Input
                value={store.keyname}
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
