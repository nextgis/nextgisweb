import { observer } from "mobx-react-lite";

import { InputValue, PasswordValue, Select } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";
import type { ConnectionCreate } from "@nextgisweb/wmsclient/type/api";

import type { WmsClientConnectionStore } from "./WmsClientConnectionStore";

export type UICapcache = NonNullable<ConnectionCreate["capcache"]> | "";

export interface Option {
    label: string;
    value: UICapcache;
}

const capcacheOptions: Option[] = [
    { label: gettext("Query"), value: "query" },
    { label: gettext("Clear"), value: "clear" },
    { label: gettext("Do not query"), value: "" },
];

const versionOptions = [
    { label: "1.1.1", value: "1.1.1" },
    { label: "1.3.0", value: "1.3.0" },
];

const msgUrl = gettext("WMS Connection URL");

export const WmsClientConnectionWidget: EditorWidget<WmsClientConnectionStore> =
    observer(({ store }) => {
        return (
            <Area pad cols={["1fr", "1fr"]}>
                <LotMV
                    row
                    label={gettext("URL")}
                    component={InputValue}
                    value={store.url}
                    props={{ placeholder: msgUrl }}
                />

                <LotMV
                    span={1}
                    label={gettext("Username")}
                    component={InputValue}
                    props={{
                        autoComplete: "new-password",
                    }}
                    value={store.username}
                />

                <LotMV
                    span={1}
                    label={gettext("Password")}
                    component={PasswordValue}
                    props={{
                        autoComplete: "new-password",
                    }}
                    value={store.password}
                />

                <LotMV
                    row
                    label={gettext("Version")}
                    component={Select}
                    value={store.version}
                    props={{
                        options: versionOptions,
                        style: { width: "100%" },
                    }}
                />

                <LotMV
                    row
                    label={gettext("Capabilities")}
                    component={Select}
                    value={store.capcache}
                    props={{
                        options: capcacheOptions,
                        style: { width: "100%" },
                    }}
                />
            </Area>
        );
    });

WmsClientConnectionWidget.displayName = "WmsClientConnectionWidget";
WmsClientConnectionWidget.title = gettext("WMS Connection");
WmsClientConnectionWidget.activateOn = { create: true };
WmsClientConnectionWidget.order = 10;
