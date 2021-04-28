import handlebars from 'handlebars/handlebars';

export function hbs(template, jed, context) {
    const _context = context || {};
    const env = handlebars.create();
    env.registerHelper("gettext", function (arg) {
        return jed.gettext(arg);
    });

    var tobj = env.compile(template);
    return tobj(_context);
}
