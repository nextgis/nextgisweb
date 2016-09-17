define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    'dijit/Toolbar',
    'ngw-webmap/MapToolbarItems'
], function (declare, i18n, hbsI18n, Toolbar, MapToolbarItems) {
    return declare([Toolbar], {
        postCreate: function () {
            this.items = new MapToolbarItems({
                display: this.display
            });
            this.items.placeAt(this.domNode);
        }
    });
});
