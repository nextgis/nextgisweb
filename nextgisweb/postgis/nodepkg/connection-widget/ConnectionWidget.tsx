import { observer } from "mobx-react-lite";

import {
    InputNumber,
    InputValue,
    PasswordValue,
    Select,
} from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area } from "@nextgisweb/gui/mayout";
import type { PostgisConnectionRead } from "@nextgisweb/postgis/type/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { ConnectionStore } from "./ConnectionStore";

const sslmodes: { value: PostgisConnectionRead["sslmode"] }[] = [
    { value: "disable" },
    { value: "allow" },
    { value: "prefer" },
    { value: "require" },
    { value: "verify-ca" },
    { value: "verify-full" },
];

export const ConnectionWidget: EditorWidgetComponent<
    EditorWidgetProps<ConnectionStore>
> = observer(({ store }: EditorWidgetProps<ConnectionStore>) => {
    return (
        <Area
            pad
            cols={[
                "auto",
                "auto",
                "auto",
                "auto",
                "min-content",
                "min-content",
            ]}
        >
            <LotMV
                span={4}
                label={gettext("Host")}
                value={store.hostname}
                component={InputValue}
            />
            <LotMV
                label={gettext("Port")}
                value={store.port}
                component={InputNumber}
                props={{
                    min: 1,
                    max: 65535,
                    placeholder: "5432",
                    controls: false,
                }}
            />
            <LotMV
                label={gettext("SSL mode")}
                value={store.sslmode}
                component={Select}
                props={{
                    options: sslmodes,
                    allowClear: true,
                    placeholder: "prefer",
                    popupMatchSelectWidth: false,
                }}
            />
            <LotMV
                span={3}
                label={gettext("User")}
                value={store.username}
                component={InputValue}
            />
            <LotMV
                span={3}
                label={gettext("Password")}
                value={store.password}
                component={PasswordValue}
                props={{
                    visibilityToggle: false,
                    autoComplete: "new-password",
                }}
            />
            <LotMV
                row
                label={gettext("Database")}
                value={store.database}
                component={InputValue}
            />
        </Area>
    );
});

ConnectionWidget.displayName = "ConnectionWidget";
ConnectionWidget.title = gettext("PostGIS connection");
ConnectionWidget.activateOn = { create: true };
ConnectionWidget.order = -50;
