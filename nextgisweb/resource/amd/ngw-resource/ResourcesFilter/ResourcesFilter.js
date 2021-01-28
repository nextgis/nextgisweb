define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/on",
    "dojo/dom-class",
    "dojo/html",
    "dojo/query",
    "dojo/debounce",
    "dojo/request/xhr",
    "dojox/dtl",
    "dojox/dtl/Context",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw/route",
    "ngw-pyramid/hbs-i18n",
    "ngw-pyramid/i18n!resource",
    "dojo/text!./ResourcesFilter.hbs",
    "dojo/text!./ResourcesFilterResult.dtl.hbs",
    "xstyle/css!./ResourcesFilter.css",
    "dijit/form/TextBox"
], function (
    declare, lang, array, on, domClass, html, query, debounce, xhr,
    dtl, dtlContext, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    route, hbsI18n, i18n, template, templateResult
) {
    var TEMPLATE_RESULT_DTL = new dtl.Template(templateResult),
        SVG_URL = ngwConfig.assetUrl + "/svg/svg-symbols.svg",
        resourceSearchRoute = route.resource.search,
        resourceShowRoute = route.resource.show;

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        baseClass: "resources-filter",
        title: i18n.gettext("Search resources"),

        postCreate: function () {
            var input = query('input', this.tbSearch.domNode)[0];
            on(input, "focus", lang.hitch(this, this.onFocusInput));
            on(input, "blur", lang.hitch(this, this.onBlurInput));

            on(this.tbSearch, "keyUp", debounce(lang.hitch(this, this.onChangeSearchInput), 1000));
        },

        onFocusInput: function () {
            domClass.add(this.domNode, "active");
        },

        onBlurInput: function () {
            domClass.remove(this.domNode, "active");
        },

        onChangeSearchInput: function () {
            var value = this.tbSearch.get("value");
            if (!value) return false;

            this.search(value);
        },

        search: function (value) {
            xhr.get(resourceSearchRoute(), {
                handleAs: "json",
                query: {display_name: value}
            }).then(
                lang.hitch(this, this.onSearchSuccess),
                lang.hitch(this, this.onSearchFail)
            );
        },

        onSearchSuccess: function (result) {
            var templateContext, resultHtml;
            
            result = array.map(result, function (item) {
                item.url = resourceShowRoute({id: item.resource.id});
                return item;
            }, this);

            templateContext = new dtlContext({
                svgUrl: SVG_URL,
                items: result
            });
            resultHtml = TEMPLATE_RESULT_DTL.render(templateContext);
            html.set(this.result, resultHtml);
        },

        onSearchFail: function (result) {
            console.error(result);
        }
    });
});
