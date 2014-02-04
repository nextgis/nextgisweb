define([
    "dojo/_base/declare",
    "dojo/store/JsonRest",
    "dojo/json",
], function (
    declare,
    JsonRest,
    json
) {
    return declare(JsonRest, {
        constructor: function (options) {
            this.target = ngwConfig.applicationUrl + '/layer/' + options.layer + '/store_api/';

            if (this.fieldList) { this.headers["X-Field-List"] = json.stringify(this.fieldList) };
            if (this.fieldPrefix) { this.headers["X-Field-Prefix"] = json.stringify(this.fieldPrefix) };

            if (this.featureBox) { this.headers["X-Feature-Box"] = true };
            if (this.featureExt) { this.headers["X-Feature-Ext"] = this.featureExt };
        }
    });
});