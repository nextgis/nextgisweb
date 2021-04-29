import { default as jed } from 'jed';
import loadentry from '../loadentry';

const stub = new jed({});

window.__cached_jed__ = window.__cached_jed__ || {};

export default class CachedJed {
    constructor(domain) {
        this.domain = domain;
        loadentry('@nextgisweb/jsrealm/i18n!' + domain);
    }

    static put(domain, obj) {
        window.__cached_jed__[domain] = obj;
    }

    gettext(key) {
        let obj = window.__cached_jed__[this.domain];
        if (obj === undefined) { obj = stub };
        return obj.gettext(key)
    }
}
