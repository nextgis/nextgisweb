define([
    "dojo/_base/declare",
    "dijit/_WidgetBase"
], function (
    declare,
    _WidgetBase
) {
	// Base class for widget attached to a model
    return declare([_WidgetBase], {

        // Widget contains meaningful information
        // that should be shown to a user
        hasData: function() {
            return true;
        }
    });
});
