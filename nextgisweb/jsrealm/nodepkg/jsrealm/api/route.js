import set from 'lodash-es/set.js';

import { request } from './request.js';
import routeData from '@nextgisweb/jsrealm/api/load!/api/component/pyramid/route';

export function routeURL(name, ...rest) {
    const [template, ...params] = routeData[name];
    const first = rest[0];

    let sub;
    if (first === undefined) {
        sub = [];
    } else if (typeof first === 'object' && first !== null) {
        if (rest.length > 1) {
            throw new Error("Too many arguments for route(name, object)!");
        };
        sub = [];
        for (const [p, v] of Object.entries(first)) {
            sub[params.indexOf(p)] = v;
        };
    } else {
        sub = rest;
    };

    return template.replace(/\{(\w+)\}/g, function (m, a) {
        const value = sub[parseInt(a)];
        if (value === undefined) {
            throw new Error(`Undefined parameter ${idx}:${keys[idx]} in URL ${template}.`);
        };
        return value;
    });
};

export function route(name, ...rest) {
    const template = routeURL(name, ...rest);
    const result = {};
    for (const method of ['get', 'post', 'put', 'delete']) {
        result[method] = (options) => request(
            template, Object.apply(options || {}, { method: method })
        )
    }
    return result;
}

export const compatRoute = {};
for (const [key, def] of Object.entries(routeData)) {
    const fn = (...args) => routeURL(key, ...args);
    set(compatRoute, key, fn);
}
