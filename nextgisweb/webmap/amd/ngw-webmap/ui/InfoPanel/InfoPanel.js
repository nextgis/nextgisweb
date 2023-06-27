define([
    'dojo/_base/declare', 'ngw-pyramid/dynamic-panel/DynamicPanel',
    'dijit/layout/BorderContainer',
    "@nextgisweb/gui/react-app", "@nextgisweb/webmap/info-panel"
], function (
    declare, DynamicPanel,
    BorderContainer,
    reactApp, infoPanelComp
) {
    return declare([DynamicPanel, BorderContainer], {

        constructor: function (options) {
            declare.safeMixin(this, options);

            this.makeComp = (contentNode, options) => {
                reactApp.default(
                    infoPanelComp.default,
                    {
                        display: options.display,
                        description: this.description,
                    },
                    contentNode
                );
            };
        },
        
        postCreate: function(){
            this.inherited(arguments);
        }
    });
});

