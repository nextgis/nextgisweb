define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/xhr",
    "dojo/store/JsonRest",
    "@nextgisweb/pyramid/settings!"
], function (
    declare,
    lang,
    xhr,
    JsonRest,
    settings
) {
    return declare(JsonRest, {
        get: function (id, options) {
            return xhr("GET", {
                url: lang.replace("{url}{id}/?format=json", {
                    url: settings.qms_geoservices_url,
                    id: id
                }),
                handleAs: "json",
                headers: {
                    "X-Requested-With": null
                }
            });
        },

        query: function (query, options) {
            var qopts = lang.mixin({
                "search": query.name
            }, this.queryOptions);
            query = xhr.objectToQuery(qopts);

            return xhr("GET", {
                url: lang.replace("{url}?{query}&format=json", {
                    url: settings.qms_geoservices_url,
                    query: query
                }),
                handleAs: "json",
                headers: {
                    "X-Requested-With": null
                }
            });
        }
    });
});
