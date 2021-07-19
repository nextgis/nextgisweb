/** @entrypoint */
import "whatwg-fetch";
import { routeURL } from "./api";
import pkg_version from "@nextgisweb/pyramid/api/load!/api/component/pyramid/pkg_version";
import i18n from "@nextgisweb/pyramid/i18n!";

export function init (ngupdate_url, is_admin) {
    const sysInfoURL = routeURL('pyramid.control_panel.sysinfo');
    const isSysInfo = window.location.pathname === sysInfoURL;
    const timeout = isSysInfo ? 0 : 3 * 60 * 1000;

    async function check_update () {
        const params = new URLSearchParams({
            type: "check", instance: ngwConfig.instance_id
        });
        const distr_opts = ngwConfig.distribution;
        if (distr_opts.name !== null) {
            params.append("distribution", distr_opts.name + ':' + distr_opts.version);
        }
        for (const [name, version] of Object.entries(pkg_version)) {
            params.append("package", name + ":" + version);
        }

        let response;
        try {
            response = await window.fetch(ngupdate_url + "/api/query?" + params.toString(), {
                method: "GET",
                headers: {"X-Requested-With": null}
            });
        } catch { return; }

        if (is_admin) {
            let data, distribution, has_update;
            try {
                data = await response.json();
                distribution = data.distribution;
                has_update = distribution.status === "has_update";
            } catch { return; }

            if (has_update) {
                const sidebarItem = document.createElement('a');
                sidebarItem.className = "list__item list__item--link";
                sidebarItem.style = "background-color: #cbecd9";
                sidebarItem.innerHTML = i18n.gettext("Update available");
                sidebarItem.href = sysInfoURL;
                document.querySelector("#rightMenu .list").appendChild(sidebarItem);

                document.querySelectorAll(".has-update-only").forEach((element) => {
                    element.style.display = "inherit";
                });

                const elAvailableVersion = document.getElementById('updatesAvailableVersion');
                if (elAvailableVersion) {
                    elAvailableVersion.innerHTML = `${distribution.latest.version} (${distribution.latest.date})`;
                }
            }
        }
    }

    window.setTimeout(check_update, timeout);
};
