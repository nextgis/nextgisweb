define([
    'dojo/_base/declare',
    'dojo/_base/event',
    'dojo/on',
    'dojo/query',
    '@nextgisweb/pyramid/i18n!',
    'dijit/_TemplatedMixin',
    'ngw-pyramid/dynamic-panel/DynamicPanel',
    'dijit/layout/BorderContainer',
    'dojo/dom-construct',
    'dojo/_base/lang',

    //templates
    "xstyle/css!./InfoPanel.css"
], function (
    declare,
    event,
    on,
    query,
    i18n,
    _TemplatedMixin,
    DynamicPanel,
    BorderContainer,
    domConstruct,
    lang
) {
    return declare([DynamicPanel, BorderContainer,_TemplatedMixin], {
        postCreate: function(){
            this.inherited(arguments);

            this.descriptionPane = domConstruct.create("div",{
                class:"info-panel__description",
                innerHTML: this.description
            });

            domConstruct.place(this.descriptionPane, this.contentNode);

            // zoom to feature links
            var widget = this;
            query("a, span", this.descriptionPane).forEach(function (element) {
                var tagName = element.tagName.toLowerCase();
                var target = element.getAttribute((tagName == "a") ? "href" : "data-target");
                if (/^\d+:\d+$/.test(target)) {
                    on(element, "click", function (e) {
                        event.stop(e);
                        widget.zoomToFeature.apply(widget, target.split(":"));
                    });
                }
            });
        },

        zoomToFeature: function (resid, fid) {
            this.display
                .featureHighlighter
                .highlightFeatureById(fid, resid)
                .then(lang.hitch(this, function (feature) {
                    this.display.map.zoomToFeature(feature);
                }));
        }
    });
});

