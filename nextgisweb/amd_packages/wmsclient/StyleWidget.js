define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/StyleWidget.html",
    // util
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dojo/when",
    "dojo/on",
    "put-selector/put",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/ComboBox",
    "dojox/layout/TableContainer"
], function (
    declare,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    array,
    lang,
    Deferred,
    when,
    on,
    put
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "wmsclient_style",
        title: "WMS-стиль",

        postCreate: function () {
            this.inherited(arguments);

            var fmtstore = this.wImgFormat.get("store");
            array.forEach(this.imgformat, function (i) {
                fmtstore.add({id: i, name: i});
            }, this);

            var table = put(this.wLayerSelect.containerNode,
                "table.data[width=100%] tr th $ < th $ <<", "Имя", "Описание");
            array.forEach(this.wmslayers, function (i) {
                var node = put(table, "tr td $ < td a.action $ ", i.id, i.title);
                on(node, "click", lang.hitch(this, this.toggleLayer, i.id));
            }, this);
        },

        toggleLayer: function (id) {
            var arr = this.wWMSLayers.get("value").split(/,\s*/);
            if (arr.length == 1 && arr[0] == "") {
                arr = [];
            };
            var idx = arr.indexOf(id);
            if (idx == -1) {
                arr.push(id);
            } else {
                arr.splice(idx, 1);
            };
            this.wWMSLayers.set("value", arr.join(", "));
        },

        _getValueAttr: function () {
            var result = { 
                wmslayers: this.wWMSLayers.get("value").split(/,\s*/).join(),
                imgformat: this.wImgFormat.get("value")
            };

            return result;
        },

        _setValueAttr: function (value) {
            this.wWMSLayers.set("value", value["wmslayers"].split(/,\s*/).join(', '));
            this.wImgFormat.set("value", value["imgformat"]);
        },

        validateWidget: function () {
            var widget = this;
            var result = { isValid: true, error: [] };

            array.forEach([this.wWMSLayers, this.wImgFormat], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();   

                // если есть ошибки, фиксируем их
                if ( !subw.isValid() ) {
                    result.isValid = false;
                };
            });

            return result;
        }

    });
})