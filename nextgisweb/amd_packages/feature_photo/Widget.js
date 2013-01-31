define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Widget.html",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dijit/form/CheckBox",
    "dojox/layout/TableContainer",
    // template
    "dijit/TitlePane",
    "ngw/form/Uploader"
    // css   
], function (
    declare,
    Widget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    array,
    domConstruct,
    domStyle,
    CheckBox,
    TableContainer
) {
    return declare([Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        title: "Фотографии",

        postCreate: function () {
            this.inherited(arguments);

            var widget = this;

            this.deleteCheckBoxes = [];

            array.forEach(widget.value, function (photo) {
                widget._addImage(photo.id);
            });
        },

        _getValueAttr: function () {
            var result = [];

            for (var i = 0; i < this.value.length; i++) {
                console.log(result);
                if (!this.deleteCheckBoxes[i].get("checked")) {
                    result.push(this.value[i]);
                };
            };

            for (var i = 1; i <= 5; i++) {
                var value = this["wFile" + i].get("value");
                if (value) {
                    result.push({upload: value.id});
                };
            };

            return result;
        },

        _addImage: function (photoId) {
            var mainDiv = domConstruct.create("div", {
                style: "display: inline-block; margin-bottom: 1ex; margin-right: 1ex; background-color: #eee;"
            }, this.imageContainer);

            var imgDiv = domConstruct.create("div", {
                style: "display: table-cell; width: 136px; height: 136px; background-color: #ddd; vertical-align: middle; text-align: center;"
            }, mainDiv);

            imgSrc = application_url + '/layer/' + this.layer + '/feature/' + this.feature + '/photo/' + photoId;

            var link = domConstruct.create("a", {
                href: imgSrc,
                target: "_blank",
                style: "border: none"
            }, imgDiv);

            domConstruct.create("img", {
                src: imgSrc + "?size=128x128"
            }, link);

            var tableContainer = new TableContainer({
                cols: 1,
                labelWidth: '100%'
            });
            tableContainer.placeAt(mainDiv);

            var cbId = "feature_photo_" + this.layer + "_" + this.feature + "_" + photoId;
            var cb = new CheckBox({id: cbId, title: "Удалить"});
            tableContainer.addChild(cb);
            tableContainer.startup();

            this.deleteCheckBoxes.push(cb);
        }
    });
});