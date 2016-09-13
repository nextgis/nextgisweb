define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/store/JsonRest',
    'dojo/request/xhr',
    'dojo/dom-style',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/MenuItem',
    'dojo/text!./template/MapToolbarItems.hbs',
    'ngw/route',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    'dijit/form/DropDownButton',
    'dijit/form/Button',
    'dijit/ToolbarSeparator'
], function (declare, array, lang, JsonRest, xhr, domStyle,
             _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             MenuItem, template, route, i18n, hbsI18n) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),

        constructor: function (options) {
            this.display = options.display;
        },

        loadBookmarks: function () {
            if (this.display.config.bookmarkLayerId) {
                var store = new JsonRest({
                    target: route.feature_layer.store({
                        id: this.display.config.bookmarkLayerId
                    })
                });

                var display = this.display;

                store.query().then(
                    function (data) {
                        array.forEach(data, function (f) {
                            display.mapToolbar.items.bookmarkMenu.addChild(new MenuItem({
                                label: f.label,
                                onClick: function () {
                                    // Отдельно запрашиваем экстент объекта
                                    xhr.get(route.feature_layer.store.item({
                                        id: display.config.bookmarkLayerId,
                                        feature_id: f.id
                                    }), {
                                        handleAs: "json",
                                        headers: {"X-Feature-Box": true}
                                    }).then(
                                        function data(featuredata) {
                                            display.map.olMap.getView().fit(
                                                featuredata.box,
                                                display.map.olMap.getSize()
                                            );
                                        }
                                    );
                                }
                            }));
                        });
                    }
                );
            } else {
                // Если слой с закладками не указан, то прячем кнопку
                domStyle.set(this.bookmarkButton.domNode, "display", "none");
            }
        }
    });
});
