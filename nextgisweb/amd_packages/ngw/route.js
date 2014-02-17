/* globals define, ngwConfig */
define([
    "./load-json!pyramid/routes",
], function (
    routes
) {
    return function (route, args) {
        return ngwConfig.applicationUrl +
            routes[route].pattern.replace(/__(\w+)__/g, function (match, a) {
                return args[a];
            });
    };
});