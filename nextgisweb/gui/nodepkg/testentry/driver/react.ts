/** @plugin jsrealm/testentry/driver */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { registry } from "@nextgisweb/jsrealm/testentry/driver";

registry.register({
    component: "gui",
    identity: "react",
    loader: async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reactApp: any = await entrypoint("@nextgisweb/gui/react-app");
        return (module, el) => {
            const wrapper = document.createElement("div");
            el.appendChild(wrapper);
            reactApp.default(module, {}, wrapper);
        };
    },
});
