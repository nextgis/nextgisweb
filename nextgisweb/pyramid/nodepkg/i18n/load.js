import { route } from "../api";
import { Jed, stub } from "./jed";
import { callingComponent, LoaderCache } from "../util/loader";

const locale = dojoConfig.locale;

const cache = new LoaderCache();

export const normalize = callingComponent;

export function load(component, require, load) {
    if (component == "") {
        const msg =
            `No component identifier was given while importing i18n! Using ` +
            `dummy translation as a fallback.`;
        console.error(new Error(msg));
        load(stub);
    }

    const loader = () => {
        return route("pyramid.locdata", component, locale)
            .get({ query: { skey: ngwConfig.staticKey } })
            .catch((error) => {
                const msg =
                    `Failed to load translation to locale "${locale}" ` +
                    `and domain "${component}". Using dummy translation ` +
                    `as a fallback.`;
                console.error(msg, error);
                throw error;
            });
    };

    cache.promiseFor(component, loader).then(
        (data) => load(new Jed(component, data)),
        () => load(stub)
    );
}
