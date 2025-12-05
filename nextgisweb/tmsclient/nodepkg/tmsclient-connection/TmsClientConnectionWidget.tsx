import { observer } from "mobx-react-lite";

import {
    CheckboxValue,
    InputValue,
    PasswordValue,
    Select,
} from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";
import type { ConnectionRead } from "@nextgisweb/tmsclient/type/api";

import type { TmsClientConnectionStore } from "./TmsClientConnectionStore";

const schemas: { value: ConnectionRead["scheme"]; label: string }[] = [
    { value: "xyz", label: "XYZ" },
    { value: "tms", label: "TMS" },
];

export const TmsClientConnectionWidget: EditorWidget<TmsClientConnectionStore> =
    observer(({ store }) => {
        const customMode = store.capmode.value !== "nextgis_geoservices";

        return (
            <Area pad cols={["1fr", "1fr", "1fr", "6em"]}>
                <Lot row label={gettext("Type")}>
                    <Select
                        value={
                            store.capmode.value === null
                                ? ""
                                : store.capmode.value
                        }
                        onChange={(val) => {
                            store.capmode.value =
                                val === ""
                                    ? null
                                    : (val as typeof store.capmode.value);
                        }}
                        options={[
                            { label: gettext("Custom"), value: "" },
                            {
                                label: "NextGIS Geoservices",
                                value: "nextgis_geoservices",
                            },
                        ]}
                        style={{ width: "100%" }}
                    ></Select>
                </Lot>
                <LotMV
                    span={customMode ? 3 : 4}
                    label={gettext("URL template")}
                    component={InputValue}
                    value={store.urlTemplate}
                    visible={customMode}
                />
                <LotMV
                    label={gettext("Scheme")}
                    value={store.scheme}
                    component={Select}
                    props={{
                        options: schemas,
                        style: { width: "100%" },
                    }}
                    visible={customMode}
                />
                <LotMV
                    span={customMode ? 2 : 4}
                    label={gettext("API key")}
                    component={InputValue}
                    value={store.apikey}
                />
                <LotMV
                    span={2}
                    label={gettext("API key param")}
                    component={InputValue}
                    value={store.apikeyParam}
                    visible={customMode}
                />
                <LotMV
                    span={2}
                    label={gettext("Username")}
                    component={InputValue}
                    value={store.username}
                    visible={customMode}
                    props={{
                        autoComplete: "new-password",
                    }}
                />
                <LotMV
                    span={2}
                    label={gettext("Password")}
                    component={PasswordValue}
                    value={store.password}
                    visible={customMode}
                    props={{
                        autoComplete: "new-password",
                    }}
                />
                <LotMV
                    row
                    value={store.insecure}
                    label={false}
                    props={{
                        children: gettext(
                            "Skip SSL/TLS certificate verification"
                        ),
                    }}
                    component={CheckboxValue}
                />
            </Area>
        );
    });

TmsClientConnectionWidget.displayName = "TmsClientConnectionWidget";
TmsClientConnectionWidget.title = gettext("TMS connection");
TmsClientConnectionWidget.activateOn = { create: true };
TmsClientConnectionWidget.order = 10;
