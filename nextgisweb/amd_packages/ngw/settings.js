define([
    "dojo/request/xhr",
    "ngw/route"
], function (
    xhr,
    route
) {
    return {
        load: function (id, require, load) {
            xhr.get(route.pyramid.settings(), {
                handleAs: "json",
                query: { component: id }
            }).then(
                function (data) {
                    load(data);
                },
                function (error) {
                    load();
                }
            );
        }
    };
});
