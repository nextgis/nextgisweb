/** @entrypoint */
import 'whatwg-fetch';
import { routeURL } from './api';

const callbacks = [];
let data = undefined;

function addDistributionAndPackagesParams(params) {
    const dist = ngwConfig.distribution;
    if (dist !== null) {
        params.append('distribution', `${dist.name}:${dist.version}`);
    }
    const packageVerion = Object.entries(ngwConfig.packages).sort((a, b) =>
        a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0,
    );
    for (const [name, version] of packageVerion) {
        params.append('package', name + ':' + version);
    }
}

export function queryUrl(type) {
    const params = new URLSearchParams();
    addDistributionAndPackagesParams(params);
    params.append('instance', ngwConfig.instanceId);
    params.append('event', type);
    return `${ngwConfig.ngupdateUrl}/api/query?${params.toString()}`;
}

export function notesUrl() {
    const params = new URLSearchParams();
    addDistributionAndPackagesParams(params);
    params.append('lang', ngwConfig.locale);
    return `${ngwConfig.ngupdateUrl}/api/notes?${params.toString()}`;
}

export function registerCallback(fn) {
    if (data === undefined) {
        callbacks.push(fn);
    } else {
        cb(data);
    }
}

export function init() {
    const sysInfoURL = routeURL('pyramid.control_panel.sysinfo');
    const isSysInfo = window.location.pathname === sysInfoURL;
    const timeout = isSysInfo ? 0 : 3 * 60 * 1000;

    async function checkForUpdates() {
        const url = queryUrl('check_for_updates');
        try {
            data = await (await window.fetch(url)).json();
        } catch {
            data = null;
            return;
        }
        callbacks.forEach((cb) => cb(data));
    }
    window.setTimeout(checkForUpdates, timeout);
}
