define(["@nextgisweb/pyramid/api"], function (api) {
    return {
        load: function (id, require, load) {
            var url = api.routeURL('pyramid.settings') + '?component=' + id;
            api.request(url).then(function (data) {
                load(data);
            })
        }
    }
});
