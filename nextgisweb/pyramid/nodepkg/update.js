/** @entrypoint */
import "whatwg-fetch";
import { default as domConstruct } from "dojo/dom-construct";
import { default as query } from "dojo/query";
import { routeURL } from "./api";
import pkg_version from "@nextgisweb/pyramid/api/load!/api/component/pyramid/pkg_version";

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
            let has_update = false;
            try {
                const data = await response.json();
                has_update = data.distribution.status === "has_update";
            } catch { return; }

            if (has_update) {
                const list = query("#rightMenu .list")[0];
                domConstruct.create("a", {
                    class: "list__item",
                    innerHTML: "New update available",
                    href: sysInfoURL,
                }, list);

                query(".has-update-only").forEach((element) => {
                    element.style.display = "inherit";
                });
            }
        }
    }

    window.setTimeout(check_update, timeout);
};
