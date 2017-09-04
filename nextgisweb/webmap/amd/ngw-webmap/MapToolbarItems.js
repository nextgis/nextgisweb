define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/store/JsonRest',
    'dojo/request/xhr',
    'dojo/dom-style',
    'dojo/on',
    'dijit/_WidgetBase',
    'dijit/MenuItem',
    'dijit/form/ToggleButton',
    './controls/ToggleControl',
    'ngw/route',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    'ngw-webmap/MapStatesObserver',
    'dijit/ToolbarSeparator',
    'dijit/form/DropDownButton'
], function (declare, array, lang, JsonRest, xhr, domStyle, on,
             _WidgetBase, MenuItem, ToggleButton, ToggleControl,route, i18n, hbsI18n, MapStatesObserver,
             ToolbarSeparator) {
    return declare([_WidgetBase], {

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
                    this.display.map.olMap.getView().fit(featureData.box);
                }
            ));
        },

        addTool: function (tool, state) {
            var tglButtonTool = new ToggleControl({
                label: tool.label,
                showLabel: false,
                iconClass: tool.iconClass,
                tool: tool,
                state: state,
                intermediateChanges:false,
                customIcon: tool.customIcon,
                class: "ol-control ol-unselectable"
            }).placeAt(this);

            tool.toolbarBtn = tglButtonTool;
            this._bindChangeEvent(tglButtonTool);

            tglButtonTool.activate = lang.hitch(this, function () {
                this._unbindChangeEvent(tglButtonTool);
                tglButtonTool.set('checked', true);
                this._bindChangeEvent(tglButtonTool);
                tglButtonTool.tool.activate();
            });

            tglButtonTool.deactivate = lang.hitch(this, function () {
                this._unbindChangeEvent(tglButtonTool);
                tglButtonTool.set('checked', false);
                this._bindChangeEvent(tglButtonTool);
                tglButtonTool.tool.deactivate();
            });

            this.mapStates.addState(state, tglButtonTool, false);
        },

        _bindChangeEvent: function (tglButtonTool) {
            tglButtonTool._changeEventHandler = on(tglButtonTool, 'change', lang.hitch(this, function () {
                this._toolChangeEventHandle(tglButtonTool);
            }));
        },

        _unbindChangeEvent: function (tglButtonTool) {
            if (tglButtonTool._changeEventHandler) {
                tglButtonTool._changeEventHandler.remove();
                delete tglButtonTool._changeEventHandler;
            }
        },

        _toolChangeEventHandle: function (tglButtonTool) {
            var checked = tglButtonTool.get('checked');
            if (checked) {
                this.mapStates.activateState(tglButtonTool.state);
            } else {
                this.mapStates.deactivateState(tglButtonTool.state);
            }
        },

        addSeparator: function () {
            var toolbarSeparator = new ToolbarSeparator();
            toolbarSeparator.placeAt(this);
        },

        addButton: function (Button, options) {
            var button = new Button(options);
            button.display = this.display;
            button.placeAt(this);
        }
    });
});
