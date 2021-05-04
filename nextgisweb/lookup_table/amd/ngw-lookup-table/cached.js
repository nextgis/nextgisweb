define([
    "dojo/Deferred",
    "dojo/request/xhr",
    "ngw/route"
], function (
    Deferred,
    xhr,
    route
) {

    var cache = {};

    return {
        load: function (resourceId) {
            var payload = cache[resourceId];
            if (payload !== undefined) {
                var result = new Deferred();
                result.resolve(payload);
                return result;
            };

            var url = route.resource.item({id: resourceId});

            return xhr.get(
                url,  {handleAs: 'json' }
            ).then(function (payload) {
                var data = payload.lookup_table.items;
                cache[resourceId] = data;
                return data;
            }, function (err) {
                console.error("Failed to load lookup table resource from " + url);
                return null
            });
        },

        lookup: function (resourceId, key) {
            var data = cache[resourceId];
            if (data === undefined || data === null) { return null };
            var value = data[key];
            if (value === undefined) { return null };
            return value;
        }
    }    
})