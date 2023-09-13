/** @plugin jsrealm/testentry/driver */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { registry } from "@nextgisweb/jsrealm/testentry/driver";

registry.register({
    component: "gui",
    identity: "react",
    loader: async () => {
        const { default: reactApp } = await import("@nextgisweb/gui/react-app");
        return (name: string, el: HTMLElement) => {
            entrypoint(name).then(({ default: Component }) => {
                reactApp(Component, {}, el);
            });
        };
    },
});
