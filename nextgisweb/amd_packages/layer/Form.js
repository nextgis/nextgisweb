define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Form.html",
    "dojo/_base/array",
    "dojo/_base/Deferred",
    "dojo/promise/all",
    "dijit/TitlePane",
    "dojo/dom-style"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    array,
    Deferred,
    all,
    TitlePane,
    domStyle
) {
    return declare("layer.Form", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        constructor: function (kwArgs) {
            this.widgetModules = kwArgs.widgetModules;

            this._widgets = [];
            this._defWidgetsCreated = [];

            var form = this;
            array.forEach(this.widgetModules, function (modName) {
                var def = new Deferred();
                form._defWidgetsCreated.push(def);

                var pane = new TitlePane();

                // небольшое расстояние между панельками, иначе совсем некрасиво
                domStyle.set(pane.domNode, "margin", "0 0 1ex 0");

                require([modName], function (Module) {
                    var widget = new Module({}).placeAt(pane);
                    pane.set("title", widget.title);
                    form._widgets.push(widget);
                    def.resolve({"widget": widget, "pane": pane});
                });
            })
        },

        startup: function () {
            this.inherited(arguments);

            var form = this;
            all(this._defWidgetsCreated).then(function (data) {
                array.forEach(data, function (widgetAndPane) {
                    widgetAndPane.pane.placeAt(form.focusNode);
                    widgetAndPane.pane.startup();
                    widgetAndPane.widget.startup();
                });
            });
        },

        _setValueAttr: function (value) {
            array.forEach(this._widgets, function(widget) {
                widget.set("value", value.identity);
            });
        },

        _getValueAttr: function () {
            var result = {};
            
            array.forEach(this._widgets, function (widget) {
                result[widget.identity] = widget.get("value");
            });

            return result;
        }

    });
})