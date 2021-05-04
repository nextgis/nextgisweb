import { default as jed } from "jed";
import handlebars from "handlebars/handlebars";

const locale = dojoConfig.locale;

const lazyCache = {};

export class Jed {
    constructor(domain, data) {
        this.domain = domain;
        if (domain !== undefined && data !== undefined) {
            this.jedObject = new jed({
                domain: domain,
                locale_data: { [domain]: data },
                missing_key_callback: this.missingCallback,
            });
        } else {
            this.jedObject = new jed({});
        }
        this.gettext = this.jedObject.gettext.bind(this.jedObject);
        lazyCache[domain] = this;
    }

    renderTemplate(template, context) {
        if (this.handlebars === undefined) {
            this.handlebars = handlebars.create();
            this.handlebars.registerHelper("gettext", this.gettext);
        }
        const compiled = this.handlebars.compile(template);
        return compiled(context || {});
    }

    missingCallback(key) {
        if (locale !== "en") {
            const msg = `Translation to locale "${locale}" is missing for domain "${this.domain}" and key "${key}"!`;
            console.info(msg);
        }
    }
}

export const stub = new Jed();

export class LazyJed {
    constructor(domain) {
        this.domain = domain;
    }

    get jedObject() {
        return lazyCache[this.domain] || stub;
    }

    gettext(key) {
        return this.jedObject.gettext(key);
    }

    renderTemplate(template, context) {
        return this.jedObject.renderTemplate(template, context);
    }
}
