/** @plugin */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { registry } from "@nextgisweb/jsrealm/testentry/driver";

registry.register(
    { component: COMP_ID, identity: "react" },
    {
        promise: async () => {
            const { default: reactApp } = await import(
                "@nextgisweb/gui/react-app"
            );
            return (name: string, el: HTMLElement) => {
                entrypoint<{ default: React.ComponentType }>(name).then(
                    ({ default: Component }) => {
                        reactApp(Component, {}, el);
                    }
                );
            };
        },
    }
);
