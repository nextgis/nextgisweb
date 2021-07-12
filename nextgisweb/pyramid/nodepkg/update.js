/** @entrypoint */
import "whatwg-fetch";
import { default as domConstruct } from "dojo/dom-construct";
import { default as query } from "dojo/query";
import { routeURL } from "./api";

export function init (ngupdate_url, is_admin) {
    const sysInfoURL = routeURL('pyramid.control_panel.sysinfo');
    const isSysInfo = window.location.pathname === sysInfoURL;
    const timeout = isSysInfo ? 0 : 3 * 60 * 1000;

    async function check_update () {
        const distr_opts = ngwConfig.distribution;
        const params = { type: "check", instance: ngwConfig.instance_id };
        if (distr_opts.name !== null) {
            params.distribution = distr_opts.name + ':' + distr_opts.version;
        }

        let response;
        try {
            response = await window.fetch(ngupdate_url + "/api/query", {
                query: params,
                headers: {"X-Requested-With": null}
            });
        } catch { return; }

        if (is_admin) {
            let has_update = false;
            has_update = true;
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
