define([
    "dojo/request/xhr"
], function (
    xhr
) {
    return {
        load: function (id, require, load) {
            xhr.get(ngwConfig.applicationUrl + '/settings', {
                handleAs: 'json',
                query: { component: id }
            }).then(
                function (data) {
                    load(data);
                },
                function (error) {
                    load();
                }
            )
        }
    }
});