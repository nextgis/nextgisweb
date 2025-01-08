/** @plugin */
import reactApp from "@nextgisweb/gui/react-app";
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { registry } from "@nextgisweb/jsrealm/testentry/driver";

registry.registerLoader(
    COMP_ID,
    async () => {
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
