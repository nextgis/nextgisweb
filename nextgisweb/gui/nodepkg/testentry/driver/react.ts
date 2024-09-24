/** @plugin */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { registry } from "@nextgisweb/jsrealm/testentry/driver";

registry.register(
    COMP_ID,
    async () => {
        const { default: reactApp } = await import("@nextgisweb/gui/react-app");
        return (name: string, el: HTMLElement) => {
            entrypoint<{ default: React.ComponentType }>(name).then(
                ({ default: Component }) => {
                    reactApp(Component, {}, el);
                }
            );
        };
    },
    { identity: "react" }
);
