define([
    'dojo/_base/declare',
    'dojo/_base/event',
    'dojo/on',
    'dojo/query',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    'dijit/_TemplatedMixin',
    'ngw-pyramid/dynamic-panel/DynamicPanel',
    'dijit/layout/BorderContainer',
    'dojo/dom-construct',
    'ngw/route',

    //templates
    "xstyle/css!./InfoPanel.css"
], function (
    declare,
    event,
    on,
    query,
    i18n,
    hbsI18n,
    _TemplatedMixin,
    DynamicPanel,
    BorderContainer,
    domConstruct,
    route
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
            var display = this.display;
            var minZoom = 12;

            display
            .featureHighlighter
            .highlightFeatureById(fid, resid)
            .then(function (feature) {
                var geometry = feature.getGeometry();
                var view = display.map.olMap.getView();
                var extent = geometry.getExtent();
                if (geometry.getType() === 'Point') {
                    view.setCenter(geometry.getCoordinates());
                    if (view.getZoom() < minZoom) {
                        view.setZoom(minZoom);
                    }
                } else {
                    view.fit(extent);
                }
            });
        }
    });
});

