define([
    "handlebars/handlebars"
], function (
    handlebars
) {
    var translate = function (template, jed) {
        var env = handlebars.create();
        env.registerHelper("gettext", function (arg) {
            return jed.gettext(arg);
        });

        var tobj = env.compile(template);
        return tobj({});
    };

    return translate;
});