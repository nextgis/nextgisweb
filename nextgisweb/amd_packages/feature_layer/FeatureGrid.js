define([
    'dojo/_base/declare',
    // dgrid & plugins
    'dgrid/OnDemandGrid',
    'dgrid/Selection',
    // other
    'dojo/store/JsonRest',
    'dojo/store/Observable',
], function (
    declare,
    // dgrid & plugins
    OnDemandGrid,
    Selection,
    // other
    JsonRest,
    Observable
) {
    return declare([OnDemandGrid, Selection], {

        preamble: function (options) {
            var store = new Observable(new JsonRest({
                target: application_url + '/layer/' + options.layer_id
                    + '/store_api'
            }));

            options.store = store;
        }
    });
});