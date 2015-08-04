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
        load: function (arg, parentRequire, load) {
            var args = arg.split(":", 3);
            var comp = args[0], mode = args[1], modarg = args[2];

            xhr.get(route.pyramid.locdata(locale, comp), {
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
                                    // Все строки по-умолчанию английские - их игнорируем
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

                    if (mode === undefined) {
                        load(jedobj);
                    } else if (mode === "template") {
                        var templateUrl = parentRequire.toUrl(modarg);
                        require([
                            "handlebars/handlebars",
                            "dojo/text!" + templateUrl
                        ], function (
                            handlebars,
                            templatestring
                        ) {
                            var hbsenv = new handlebars.create();
                            hbsenv.registerHelper("gettext", function (arg) { return jedobj.gettext(arg); });
                            var template = hbsenv.compile(templatestring, {}, hbsenv);
                            load(template({}));
                        });
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