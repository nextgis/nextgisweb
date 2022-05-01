define([
    "dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/Deferred",
    "dojo/on", "dojo/dom-class", "dojo/dom-attr", "dojo/html", "dojo/query",
    "dojo/debounce", "dojo/request/xhr", "dojo/DeferredList", "dojo/mouse",
    "dojox/dtl", "dojox/dtl/Context", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
    "@nextgisweb/pyramid/api", '@nextgisweb/pyramid/i18n!resource',
    "dojo/text!./ResourcesFilter.hbs", "dojo/text!./ResourcesFilterResult.dtl.hbs",
    "dojox/dtl/tag/logic",
    "xstyle/css!./ResourcesFilter.css",
    "dijit/form/TextBox"
], function (
    declare, lang, array, Deferred, on, domClass, domAttr, html, query, debounce, xhr,
    DeferredList, mouse, dtl, dtlContext, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    api, i18n, template, templateResult
) {
    const TEMPLATE_RESULT_DTL = new dtl.Template(templateResult);
    const translateDtl = {
        notFound: i18n.gettext("Resources not found"),
    };
    const resourceSearchRoute = api.routeURL("resource.search");

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        title: i18n.gettext("Search resources"),
        activeFoundResourceEl: null,

        postCreate: function () {
            on(this.tbSearch, "focus", lang.hitch(this, this.onFocus));
            on(this.tbSearch, "blur", lang.hitch(this, this.onBlur));
            on(this.tbSearch, "keydown", lang.hitch(this, this.onKeyDown));

            on(
                this.tbSearch,
                "keyUp",
                debounce(lang.hitch(this, this.onChangeSearchInput), 1000)
            );
        },

        onFocus: function () {
            domClass.add(this.domNode, "active");
        },

        onBlur: function () {
            setTimeout(() => {
                domClass.remove(this.domNode, "active");
            }, 500);
        },

        onKeyDown: function (e) {
            switch (e.key) {
                case "ArrowUp":
                    this.selectNearResourceItem(true);
                    break;
                case "ArrowDown":
                    this.selectNearResourceItem(false);
                    break;
                case "Enter":
                    this.goToSelectedResourceItem();
                    break;
            }
        },

        getMinTimePromise: function (timeMs) {
            const deferred = new Deferred();
            setTimeout(() => {
                deferred.resolve();
            }, timeMs);
            return deferred;
        },

        _lastSearchValue: null,
        onChangeSearchInput: function () {
            const searchInputValue = this.tbSearch.get("value").trim();
            if (this._lastSearchValue === searchInputValue) {
                return false;
            }

            this._lastSearchValue = searchInputValue;

            if (!searchInputValue || searchInputValue.length < 3) {
                html.set(this.result, "");
                return false;
            }

            this.search(searchInputValue);
        },

        search: function (value) {
            domClass.add(this.domNode, "loading");
            html.set(this.result, "");

            const deferredList = new DeferredList([
                this.getMinTimePromise(1000),
                xhr.get(resourceSearchRoute, {
                    handleAs: "json",
                    query: { display_name__ilike: "%" + value + "%" },
                }),
            ]);

            deferredList.then(
                lang.hitch(this, function (result) {
                    const searchResult = result[1];
                    if (searchResult[0]) {
                        this.onSearchSuccess(searchResult[1]);
                    } else {
                        this.onSearchFail(searchResult[1]);
                    }
                })
            );
        },

        onSearchSuccess: function (result) {
            result = array.map(
                result,
                (item) => {
                    item.url = api.routeURL("resource.show", {
                        id: item.resource.id,
                    });
                    return item;
                },
                this
            );

            const templateContext = new dtlContext({
                items: result,
                tr: translateDtl,
            });
            const resultHtml = TEMPLATE_RESULT_DTL.render(templateContext);
            html.set(this.result, resultHtml);

            this.result.scrollTop = 0;

            const foundResourceItems = query("[data-resid]", this.domNode);
            foundResourceItems.on(
                "mouseenter",
                lang.hitch(this, this.onMouseEnterFoundResItem)
            );

            this.activeFoundResourceEl = null;

            domClass.remove(this.domNode, "loading");
        },
        
        onFoundResItemClick: function (e) {
            console.log(e);
        },

        onMouseEnterFoundResItem: function (e) {
            const { target } = e;
            this.setActiveFoundResEl(target);
        },

        setActiveFoundResEl: function (activeFoundResourceEl) {
            if (this.activeFoundResourceEl) {
                domClass.remove(this.activeFoundResourceEl, "active");
            }
            this.activeFoundResourceEl = activeFoundResourceEl;
            domClass.add(this.activeFoundResourceEl, "active");
        },

        selectNearResourceItem: function (isPrevious) {
            if (!this.activeFoundResourceEl) {
                const firstFoundResourceEl = query(
                    "[data-resid]:first-child",
                    this.domNode
                );
                if (firstFoundResourceEl.length > 0) {
                    this.setActiveFoundResEl(firstFoundResourceEl[0]);
                }
                return;
            }

            const siblingType = isPrevious
                ? "previousElementSibling"
                : "nextElementSibling";
            if (this.activeFoundResourceEl[siblingType]) {
                this.setActiveFoundResEl(
                    this.activeFoundResourceEl[siblingType]
                );
                return;
            }

            const childType = isPrevious
                ? "lastElementChild"
                : "firstElementChild";
            this.setActiveFoundResEl(
                this.activeFoundResourceEl.parentNode[childType]
            );
        },

        goToSelectedResourceItem: function () {
            if (!this.activeFoundResourceEl) return;

            window.location.href = domAttr.get(
                this.activeFoundResourceEl.firstElementChild,
                "href"
            );
        },

        onSearchFail: function (result) {
            domClass.remove(this.domNode, "loading");
            this.activeFoundResourceEl = null;
            console.error(result);
        },
    });
});
