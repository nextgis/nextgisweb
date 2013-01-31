define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "feature_layer/DisplayWidget",
    // css
    "xstyle/css!./resources/Widget.css"
], function (
    declare,
    domConstruct,
    DisplayWidget
) {
    return declare(DisplayWidget, {
        title: "Фотографии",

        render: function () {
            var widget = this,
                feature = this._feature,
                ext = feature ? feature.ext.feature_photo : undefined,
                containerNode = this.containerNode;

            containerNode.innerHTML = "";

            this.set("disabled", !ext);

            for (var idx in ext) {
                var pid = ext[idx];

                var src = ngwConfig.applicationUrl + '/layer/' + feature.layerId + '/feature/' + feature.id + '/photo/' + pid;

                var surface = domConstruct.create("div", {
                    class: "ngwFeaturePhoto-surface ngwFeaturePhoto-inline"
                }, containerNode);

                var align = domConstruct.create("div", {
                    class: "ngwFeaturePhoto-align",
                    style: "width: 64px; height: 64px;"
                }, surface);

                var a = domConstruct.create("a", {
                    href: src,
                    target: "_blank"
                }, align);

                var img = domConstruct.create("img", {
                    src: src + "?size=64x64"
                }, a);
            };
        }
    });
});