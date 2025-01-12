/** @plugin */
import type { FC } from "react";

import reactApp from "@nextgisweb/gui/react-app";
import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";
import { registry } from "@nextgisweb/jsrealm/testentry/driver";

registry.registerLoader(
    COMP_ID,
    async () => {
        return (value: FC, el: HTMLElement) => {
            reactApp(value, {}, el);
        };
    },
    { identity: "react" }
);

declare module "@nextgisweb/jsrealm/testentry/driver" {
    interface DriverValue {
        react: ImportCallback<FC>;
    }
}
