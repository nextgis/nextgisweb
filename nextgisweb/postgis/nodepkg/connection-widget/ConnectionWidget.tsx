import { observer } from "mobx-react-lite";

import { InputNumber, InputValue, PasswordValue } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { ConnectionStore } from "./ConnectionStore";

export const ConnectionWidget: EditorWidgetComponent<
    EditorWidgetProps<ConnectionStore>
> = observer(({ store }: EditorWidgetProps<ConnectionStore>) => {
    return (
        <Area pad cols={["auto", "auto", "min-content"]}>
            <LotMV
                span={2}
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
                label={gettext("User")}
                value={store.username}
                component={InputValue}
            />
            <LotMV
                span={2}
                label={gettext("Password")}
                value={store.password}
                component={PasswordValue}
                props={{ visibilityToggle: false }}
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

ConnectionWidget.title = gettext("PostGIS connection");
ConnectionWidget.activateOn = { create: true };
ConnectionWidget.order = -50;
