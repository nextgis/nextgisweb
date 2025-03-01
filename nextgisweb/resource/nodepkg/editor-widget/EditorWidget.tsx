import { observer } from "mobx-react-lite";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { InputValue } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/component";

import type { EditorWidgetComponent, EditorWidgetProps } from "../type";

import type { EditorStore } from "./EditorStore";

const msgKeynameHelp = gettext("Identifier for API integration (optional)");

export const EditorWidget: EditorWidgetComponent<
    EditorWidgetProps<EditorStore>
> = observer(({ store }) => {
    return (
        <Area pad>
            <Lot label={gettext("Display name")}>
                <InputValue
                    value={store.displayName || ""}
                    onChange={(v) => store.update({ displayName: v })}
                    status={store.displayNameIsValid ? undefined : "error"}
                    placeholder={store.sdnDynamic || store.sdnBase || undefined}
                />
            </Lot>

            {/* Hide unchangeable parent for the main resource group */}
            {store.composite.id !== 0 && (
                <Lot label={gettext("Parent")}>
                    <ResourceSelect
                        value={store.parent !== null ? store.parent : undefined}
                        onChange={(v) =>
                            store.update({
                                parent: typeof v === "number" ? v : null,
                            })
                        }
                        pickerOptions={{ initParentId: store.parent }}
                        allowClear={false}
                        disabled={store.operation === "create"}
                        style={{ width: "100%" }}
                    />
                </Lot>
            )}

            <Lot label={gettext("Owner")}>
                <PrincipalSelect
                    model={"user"}
                    systemUsers={["guest"]}
                    value={store.ownerUser || undefined}
                    onChange={(v) => store.update({ ownerUser: v as number })}
                    allowClear={false}
                    disabled={!ngwConfig.isAdministrator}
                    style={{ width: "100%" }}
                />
            </Lot>

            <Lot label={gettext("Keyname")}>
                <InputValue
                    value={store.keyname || ""}
                    onChange={(v) => store.update({ keyname: v })}
                    status={store.keynameIsValid ? undefined : "error"}
                    placeholder={msgKeynameHelp}
                    allowClear
                />
            </Lot>
        </Area>
    );
});

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Resource");
EditorWidget.order = -100;
