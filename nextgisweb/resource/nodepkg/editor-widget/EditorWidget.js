import { observer } from "mobx-react-lite";

import { Input } from "@nextgisweb/gui/antd";
import { ResourceSelect } from "@nextgisweb/resource/component";
import { PrincipalSelect } from "@nextgisweb/auth/component";

import i18n from "@nextgisweb/pyramid/i18n";

import "./EditorWidget.less";

export const EditorWidget = observer(({ store }) => {
    return (
        <div className="ngw-resource-editor-widget">
            <label>{i18n.gettext("Display name")}</label>
            <Input
                value={store.displayName}
                placeholder={store.sdnDynamic || store.sdnBase}
                onChange={(e) => {
                    store.displayName = e.target.value;
                }}
                status={store.displayNameIsValid ? undefined : "error"}
            />

            <label>{i18n.gettext("Parent")}</label>
            <ResourceSelect
                value={store.parent}
                onChange={(v) => {
                    store.parent = v;
                }}
                allowClear={false}
                disabled={store.operation === "create"}
            />

            <label>{i18n.gettext("Owner")}</label>
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

            <label>{i18n.gettext("Keyname")}</label>
            <Input
                value={store.keyname}
                status={store.keynameIsValid ? undefined : "error"}
                placeholder={i18n.gettext(
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

EditorWidget.title = i18n.gettext("Resource");
EditorWidget.order = -100;
