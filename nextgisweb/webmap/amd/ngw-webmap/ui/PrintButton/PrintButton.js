define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dijit/form/Button',
    'ngw-pyramid/i18n!webmap',
    //'../PrintMap/PrintMap'
], function (declare, lang, on, Button, i18n, PrintMap) {
    return declare([Button], {
        postCreate: function () {
            this.set('title', i18n.gettext('Print map'));
            this.set('showLabel', false);
            this.set('iconClass', 'iconPrinter');
            this.bindEvents();
        },

        bindEvents: function () {
            on(this, 'click', lang.hitch(this, function () {
                PrintMap.run(this.display.map.olMap);
            }));
        }
    });
});
