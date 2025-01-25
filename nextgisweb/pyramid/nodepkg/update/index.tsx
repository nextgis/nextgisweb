/** @entrypoint */
import { when } from "mobx";

import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { layoutStore } from "@nextgisweb/pyramid/layout";

import { updateStore } from "./UpdateStore";

export { updateStore };

export function init() {
    const sysInfoURL = routeURL("pyramid.control_panel.sysinfo");
    if (window.location.pathname === sysInfoURL) return;
    if (!ngwConfig.isAdministrator) return;

    when(
        () => !!updateStore.hasUpdate,
        () => {
            const { critical } = updateStore.hasUpdate!;
            layoutStore.addMenuItem({
                notification: critical ? "danger" : "success",
                href: routeURL("pyramid.control_panel.sysinfo"),
                title: (
                    <>
                        {critical
                            ? gettext("Critical updates are available")
                            : gettext("Updates are available")}
                        <div className="text-muted small-text">
                            {gettext("Click to see what's new")}
                        </div>
                    </>
                ),
            });
        }
    );
}
