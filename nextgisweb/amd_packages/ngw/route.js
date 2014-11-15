/* globals define, ngwConfig */
define([
    "dojo/_base/lang",
    "./load-json!pyramid/routes", 
    "./load-json!api/component/pyramid/route"
], function (
    lang,
    routes,
    rdata
) {
    var module = function (route, args) {
        console.warn("DEPRECATED: Use route.cname.rname(args) instead of route('cname.rname', args).");

        return ngwConfig.applicationUrl +
            routes[route].pattern.replace(/__(\w+)__/g, function (match, a) {
                return args[a];
            });
    };

    var generator = function (args) {
        var template = this[0], keys = this.slice(1);

        if (Object.prototype.toString.call(args) === '[object Array]') {
            var sub = args;
        } else {
            var sub = [];
            for (var k in args) { sub[keys.indexOf(k)] = args[k] }
        }

        return template.replace(/\{(\w+)\}/g, function (m, a) {
            return sub[parseInt(a)];
        });
    }

    var rcount = 0;
    for (var rname in rdata) {
        lang.setObject(rname, lang.hitch(rdata[rname], generator), module);
        rcount = rcount + 1;
    }

    console.log('Route initialization completed, registered ' + rcount + ' routes.');

    return module;
});