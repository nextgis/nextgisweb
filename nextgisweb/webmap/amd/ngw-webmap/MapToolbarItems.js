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
    'dijit/form/ToggleButton',
    'dojo/text!./template/MapToolbarItems.hbs',
    'ngw/route',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    'ngw-webmap/MapStatesObserver',
    'dijit/form/DropDownButton',
    'dijit/form/Button',
    'dijit/ToolbarSeparator'
], function (declare, array, lang, JsonRest, xhr, domStyle,
             _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             MenuItem, ToggleButton, template, route, i18n, hbsI18n, MapStatesObserver) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),

        constructor: function (options) {
            this.display = options.display;
            this.mapStates = MapStatesObserver.getInstance();
        },

        loadBookmarks: function () {
            var bookmarkId = this.display.config.bookmarkLayerId,
                store;

            if (!bookmarkId) {
                domStyle.set(this.bookmarkButton.domNode, 'display', 'none');
                return false;
            }

            store = new JsonRest({
                target: route.feature_layer.store({
                    id: this.display.config.bookmarkLayerId
                })
            });

            store.query().then(lang.hitch(this, this._buildBookmarksMenuItems));

        },

        _buildBookmarksMenuItems: function (features) {
            array.forEach(features, function (feature) {
                this.bookmarkMenu.addChild(new MenuItem({
                    label: feature.label,
                    onClick: lang.hitch(this, function () {
                        this._bookmarkClickMenuItemHandler(feature.id);
                    })
                }));
            }, this);
        },

        _bookmarkClickMenuItemHandler: function (featureId) {
            var feature = route.feature_layer.store.item({
                id: this.display.config.bookmarkLayerId,
                feature_id: featureId
            });

            xhr.get(feature, {
                handleAs: "json",
                headers: {"X-Feature-Box": true}
            }).then(lang.hitch(this, function (featureData) {
                    this.display.map.olMap.getView().fit(
                        featureData.box,
                        this.display.map.olMap.getSize()
                    );
                }
            ));
        },

        addTool: function (tool, state) {
            var control = new ToggleButton({
                label: tool.label,
                showLabel: false,
                iconClass: tool.iconClass,
                tool: tool,
                state: state,
                onChange: lang.hitch(this, function(checked){
                    if (checked) {
                        this.mapStates.activateState(control.state);
                    } else {
                        this.mapStates.deactivateState(control.state);
                    }

                })
            }).placeAt(this);
            tool.toolbarBtn = control;

            control.activate = function () {
                this.set('checked', true);
                this.tool.activate();
            };

            control.deactivate = function () {
                this.set('checked', false);
                this.tool.deactivate();
            };

            this.mapStates.addState(state, control, false);
        }

    });
});
