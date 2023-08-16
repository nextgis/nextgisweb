define([
    "dojo/_base/declare",
    "dojo/topic",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "ngw-webmap/ui/AnnotationsManager/AnnotationsManager",
    "ngw-webmap/MapStatesObserver",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/webmap/annotations-panel",
], function (
    declare,
    topic,
    DynamicPanel,
    AnnotationsManager,
    MapStatesObserver,
    reactApp,
    annPanelComp
) {
    return declare([DynamicPanel], {
        _visibleState: null,

        constructor: function (options) {
            declare.safeMixin(this, options);

            const annotUrlParam = this.display._urlParams.annot;
            let initialAnnotVisible;
            if (
                annotUrlParam &&
                (annotUrlParam === "no" ||
                    annotUrlParam === "yes" ||
                    annotUrlParam === "messages")
            ) {
                initialAnnotVisible = annotUrlParam;
            }
            this._visibleState = initialAnnotVisible;

            this.makeComp = (contentNode, options) => {
                reactApp.default(
                    annPanelComp.default,
                    {
                        display: options.display,
                        mapStates: MapStatesObserver.getInstance(),
                        initialAnnotVisible,
                        onChangeVisible: (visible) => {
                            this._visibleState = visible;
                        },
                        onTopicPublish: this.onTopicPublish,
                    },
                    contentNode
                );
            };
        },

        onTopicPublish: function (args) {
            topic.publish.apply(this, args);
        },

        postCreate: function () {
            this.inherited(arguments);

            AnnotationsManager.getInstance({
                display: this.display,
                panel: this,
            });
        },

        getAnnotVisibleState: function () {
            return this._visibleState;
        },
    });
});
