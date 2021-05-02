import { route } from "../api";
import { Jed, stub } from "./jed";
import { callingComponent, LoaderCache } from "../util/loader";

const locale = dojoConfig.locale;

const cache = new LoaderCache();

export const normalize = callingComponent;

export function load(component, require, load) {
    if (component == "") {
        console.error(new Error(
            "No component identifier was given while importing i18n! " +
            "Using dummy translation as a fallback."));
        load(stub);
    }

    const loader = () => {
        return route(
            "pyramid.locdata", component, locale
        ).get().catch(error => {
            console.error(
                `Failed to load translation to locale "${locale}" ` +
                `and domain "${component}". Using dummy translation ` +
                `as a fallback.`, error
            );
            throw error;
        })
    }

    cache.promiseFor(component, loader).then(
        data => load(new Jed(component, data)),
        error => { load(stub) }
    )
}
