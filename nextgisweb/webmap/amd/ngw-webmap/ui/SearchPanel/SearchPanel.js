define([
    "dojo/_base/declare", "ngw-pyramid/dynamic-panel/DynamicPanel",
    "@nextgisweb/gui/react-app", "@nextgisweb/webmap/search-panel",
    "dojo/topic", "openlayers/ol"
], function (
    declare, DynamicPanel,
    reactApp, searchPanelComp,
    topic, ol
) {
    return declare([
        DynamicPanel,
    ], {

        constructor: function (options) {
            declare.safeMixin(this, options);

            this.makeComp = (contentNode, options) => {
                reactApp.default(
                    searchPanelComp.default,
                    {
                        display: options.display,
                        onSelectResult: (resultInfo) => {
                            this.selectResult(options.display, resultInfo);
                        },
                    },
                    contentNode
                );
            };
        },

        postCreate: function () {
            this.inherited(arguments);
        },

        show: function () {
            this.inherited(arguments);
        },

        hide: function () {
            this.inherited(arguments);
        },

        selectResult: function (display, resultInfo) {
            display.map.zoomToFeature(
                new ol.Feature({ geometry: resultInfo.geometry })
            );
            topic.publish("feature.highlight", {
                olGeometry: resultInfo.geometry
            });
        }
    });
});
