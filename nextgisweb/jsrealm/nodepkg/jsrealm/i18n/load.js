import { default as jed } from 'jed';

import { route } from '../api';
import CachedJed from './CachedJed'

const locale = dojoConfig.locale;
const stub = new jed({});
const promisesLoaded = {};
const promisesError = {};

export function load(component, require, load) {
    let promise = promisesLoaded[component];
    if (promise === undefined) {
        promise = route('pyramid.locdata', component, locale).get();
        promisesLoaded[component] = promise;
    };

    promise.then((data) => {
        const locale_data = {};
        locale_data[component] = data;

        const jedObj = new jed({
            domain: component,
            locale_data: locale_data,
            missing_key_callback: (key) => {
                if (locale !== 'en') {
                    console.warn(
                        `Translation to locale "${locale}" is missing ` +
                        `for domain "${component}" and key "${key}"!`);
                }
            }
        });
        CachedJed.put(component, jedObj);
        load(jedObj);
    }, (err) => {
        // Don't report the same error to the console twice.
        if (promisesError[component] === undefined) {
            console.error(
                `Failed to load translation to locale "${locale}" and domain ` +
                `"${component}". Using dummy translation as a fallback.`);
            promisesError[component] = true;
        };
        load(stub);
    })
}
