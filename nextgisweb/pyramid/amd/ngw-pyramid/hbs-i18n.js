define([
    "handlebars/handlebars"
], function (
    handlebars
) {
    var translate = function (template, jed, context) {
        var _context = context || {};
        var env = handlebars.create();
        env.registerHelper("gettext", function (arg) {
            return jed.gettext(arg);
        });

        var tobj = env.compile(template);
        return tobj(_context);
    };

    return translate;
});