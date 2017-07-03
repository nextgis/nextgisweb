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
        load: function (comp, parentRequire, load) {
            xhr.get(route.pyramid.locdata(comp, locale), {
                handleAs: "json",
                headers: { "Accept": "application/json" }
            }).then(
                function (data) {
                    var jedobj;
                    try {
                        var locale_data = {};
                        locale_data[comp] = data;
                        jedobj = new jed({
                            domain: comp,
                            locale_data: locale_data,
                            missing_key_callback: function (key) {
                                if (locale !== "en") {
                                    // All strings are English by default - ignore them
                                    console.warn(jed.sprintf(
                                        "Missing key '%s' in domain '%s' for locale '%s'!",
                                        [key, comp, locale]
                                    ));
                                }
                            }
                        });
                    } catch (e) {
                        console.error(e);
                        console.warn(jed.sprintf("Locale '%s' initialization failed in domain '%s'!", [locale, comp]));
                        jedobj = dummyJed();
                    }

                    load(jedobj);
                },
                function (error) {
                    console.error(error);
                    load(dummyJed());
                }
            );
        }
    };
});
