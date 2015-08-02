/* globals console, dojoConfig */
define([
    "dojo/request/xhr",
    "jed",
    "ngw/route",
], function (
    xhr,
    jed,
    route
) {
    var locale = dojoConfig.locale;
    var dummyJed = function () { return new jed({}); };

    return {
        load: function (arg, require, load) {
            xhr.get(route.pyramid.locdata(locale, arg), {
                handleAs: "json",
                headers: { "Accept": "application/json" }
            }).then(
                function (data) {
                    try {
                        var locale_data = {};
                        locale_data[arg] = data;
                        load(new jed({
                            domain: arg,
                            locale_data: locale_data,
                            missing_key_callback: function (key) {
                                console.warn(jed.sprintf("Missing key key '%s' in domain '%s'!", [key, arg]));
                            }
                        }));
                    } catch (e) {
                        console.error(e);
                        console.warn(jed.sprintf("Locale '%s' initialization failed in domain '%s'!", [locale, arg]));
                        load(dummyJed());
                    }
                },
                function (error) {
                    console.error(error);
                    load(dummyJed());
                }
            );
        }
    };
});