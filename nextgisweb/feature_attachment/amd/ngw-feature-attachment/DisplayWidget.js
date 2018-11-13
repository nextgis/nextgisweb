define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/dom-class",
    "dojo/on",
    "dojox/image/Lightbox",
    "put-selector/put",
    "ngw/route",
    "ngw-pyramid/i18n!feature_attachment",
    "ngw-feature-layer/DisplayWidget",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + "dojox/image/resources/Lightbox.css",
    "xstyle/css!./resource/DisplayWidget.css"
], function (
    declare,
    array,
    domClass,
    on,
    Lightbox,
    put,
    route,
    i18n,
    DisplayWidget
) {
    function fileSizeToString(size) {
        var units = ["B", "KB", "MB", "GB"],
            i = 0;
        while (size >= 1024) {
            size /= 1024;
            ++i;
        }
        return size.toFixed(1) + " " + units[i];
    }

    return declare([DisplayWidget], {
        title: i18n.gettext("Attachments"),

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-feature-attachment-DisplayWidget");

            this.lbox = new dojox.image.LightboxDialog({});
        },

        startup: function () {
            this.inherited(arguments);
            this.lbox.startup();
        },

        renderValue: function (value) {
            var images = [], others = [];
            array.forEach(value, function (i) {
                if (i.is_image) { images.push(i); }
                else { others.push(i); }
            });

            if (images.length > 0) {
                array.forEach(images, function (image) {
                    var href = route.feature_attachment.download({
                        id: this.resourceId,
                        fid: this.featureId,
                        aid: image.id
                    });

                    var src = route.feature_attachment.image({
                        id: this.resourceId,
                        fid: this.featureId,
                        aid: image.id
                    });

                    var preview = src + (this.compact ? "?size=64x64" : "?size=128x128");

                    var contentClass = !this.compact ? ".content-box" : "";
                    var a = put(this.domNode, "a.image" + contentClass + "[href=$] img[src=$] <", href, preview);

                    var lbox = this.lbox;
                    lbox.addImage({href: src, title: image.description || image.name}, "main");

                    on(a, "click", function (evt) {
                        lbox.show({group: "main", href: src, title: image.description || image.name});
                        evt.preventDefault();
                    });
                }, this);
            }

            if (others.length > 0) {
                var tbody = put(this.domNode, "table.pure-table thead tr th.name $ < th.size $ < th.mime_type $ < th.description $ < < < tbody",
                    i18n.gettext("File name"), i18n.gettext("Size"), i18n.gettext("MIME type"), i18n.gettext("Description"));

                array.forEach(others, function (a) {
                    var href = route.feature_attachment.download({
                        id: this.resourceId,
                        fid: this.featureId,
                        aid: a.id
                    });

                    put(tbody, "tr td.name a[href=$] $ < < td.size $ < td.mime_type $ < td.description $",
                        href, a.name, fileSizeToString(a.size), a.mime_type,
                        a.description === null ? "" : a.description);

                }, this);
            }
        }
    });
});
