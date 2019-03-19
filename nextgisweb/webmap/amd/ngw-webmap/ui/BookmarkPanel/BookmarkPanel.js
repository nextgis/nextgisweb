define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    'dojo/store/JsonRest',
    'dojo/store/Memory',
    'ngw/route',
    "dojo/on", "dojo/dom-construct", "dojo/_base/lang", "dojo/_base/array", 'dojo/request/xhr'
], function (
    declare,
    i18n,
    hbsI18n,
    DynamicPanel,
    BorderContainer,
    JsonRest,
    Memory,
    route,
    on, domConstruct, lang, array, xhr
    ){
    return declare([DynamicPanel, BorderContainer],{
        bookmarkLayerId: undefined,
        constructor: function (options) {
            declare.safeMixin(this,options);
            this.loadBookmarks();
        },
        loadBookmarks: function () {
            var store = new JsonRest({
                target: route.feature_layer.store({
                    id: this.bookmarkLayerId
                })
            });

            store.query().then(lang.hitch(this, this._buildBookmarks));
        },
        _buildBookmarks: function(features){
            var store = new Memory({data: features});

            this.bookmarksList = domConstruct.create("ul", {
                id: "bookmarks-list",
                class: "list list--s list--multirow bookmarks"
            });

            array.forEach(store.query(null, {sort: [{ attribute: "label"}]}), function (feature) {
                var bookmarksItem = domConstruct.create("li", {
                    class: "list__item list__item--link",
                    innerHTML: feature.label,
                    tabindex: -1,
                    onclick: lang.hitch(this, function (e){
                        this._bookmarkOnClick(feature.id);
                    })
                });
                domConstruct.place(bookmarksItem, this.bookmarksList);
            }, this);

            domConstruct.place(this.bookmarksList, this.contentNode);
        },
        _bookmarkOnClick: function (featureId) {
            var feature = route.feature_layer.store.item({
                id: this.bookmarkLayerId,
                feature_id: featureId
            });

            xhr.get(feature, {
                handleAs: "json",
                headers: {"X-Feature-Box": true}
            }).then(lang.hitch(this, function (featureData) {
                    this.display.map.olMap.getView().fit(featureData.box);
                }
            ));
        },
    });
});
