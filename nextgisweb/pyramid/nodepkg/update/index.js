/** @entrypoint */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";
import { routeURL } from "../api";

const callbacks = [];
let data = undefined;

function addDistributionAndPackagesParams(params) {
    const dist = ngwConfig.distribution;
    if (dist !== null) {
        params.append("distribution", `${dist.name}:${dist.version}`);
    }
    const packageVerion = Object.entries(ngwConfig.packages).sort((a, b) =>
        a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0
    );
    for (const [name, version] of packageVerion) {
        params.append("package", name + ":" + version);
    }
}

export function queryUrl(type) {
    const params = new URLSearchParams();
    addDistributionAndPackagesParams(params);
    params.append("instance", ngwConfig.instanceId);
    params.append("event", type);
    return `${ngwConfig.ngupdateUrl}/api/query?${params.toString()}`;
}

export function notesUrl() {
    const params = new URLSearchParams();
    addDistributionAndPackagesParams(params);
    params.append("lang", ngwConfig.locale);
    params.append("title", "false");
    return `${ngwConfig.ngupdateUrl}/api/notes?${params.toString()}`;
}

export function registerCallback(fn) {
    if (data === undefined) {
        callbacks.push(fn);
    } else {
        fn(data);
    }
}

function addMenuItem(isCritical) {
    entrypoint("@nextgisweb/pyramid/layout").then((layout) => {
        const { layoutStore } = layout;
        layoutStore.addMenuItem({
            notification: isCritical ? "danger" : "success",
            href: routeURL("pyramid.control_panel.sysinfo"),
            title: (
                <>
                    {isCritical
                        ? i18n.gettext("Critical updates are available")
                        : i18n.gettext("Updates are available")}
                    <div className="text-muted small-text">
                        {i18n.gettext("Click to see what's new")}
                    </div>
                </>
            ),
        });
    });
}

function menuCallback(data) {
    const status = data.distribution && data.distribution.status;
    if (status === "has_update" || status === "has_urgent_update") {
        addMenuItem(status === "has_urgent_update");
    }
}

export function init() {
    const sysInfoURL = routeURL("pyramid.control_panel.sysinfo");
    const isSysInfo = window.location.pathname === sysInfoURL;
    const timeout = isSysInfo ? 0 : 3 * 60 * 1000;

    if (!isSysInfo && ngwConfig.isAdministrator) {
        registerCallback(menuCallback);
    }

    async function checkForUpdates() {
        const url = queryUrl("check_for_updates");
        try {
            data = await (await fetch(url)).json();
        } catch {
            data = null;
            return;
        }
        callbacks.forEach((cb) => cb(data));
    }
    setTimeout(checkForUpdates, timeout);
}
