<%page args="title, hide_resource_filter=False"/>

<% return_url = request.GET['return'] if 'return' in request.GET else False %>

<div id="header" class="header clearfix">
    <ul class="header-nav header__right">
        %if not hide_resource_filter:
            <li class="header-nav__item">
                <div class="header-resources-filter" id="resourcesFilter"></div>
            </li>
        %endif
        <li id="avatar" class="header-nav__item"></li>
        %if request.env.pyramid.options['legacy_locale_switcher']:
            <li class="header-nav__item">
                %for locale in request.env.core.locale_available:
                    %if locale != request.locale_name:
                        <a href="${request.route_url('pyramid.locale', locale=locale, _query=dict(next=request.url))}">${locale.upper()}</a>
                    %endif
                %endfor
            </li>
        %endif
        <li id="menu" class="header-nav__item"></li>
    </ul>

    <div class="header__left">
        <div class="header__title">
            <a class="header__title-logo" href="${return_url if return_url else request.application_url}">
                %if return_url:
                    <img class="logo__pic" src="${request.static_url('nextgisweb:static/img/return-button.svg')}"/>
                %else:
                    <%
                        if request.env.core.settings_exists('pyramid', 'logo'):
                            logo_url = request.route_url('pyramid.logo', _query=dict(
                                ckey=request.env.core.settings_get('pyramid', 'logo.ckey')))
                        else:
                            logo_url = request.static_url('nextgisweb:static/img/nextgis_logo_s.svg')
                    %>
                    <img class="logo__pic" src="${logo_url}"/>
                %endif
            </a>
            <div class="header__title__inner">
                ${title}
            </div>
        </div>
    </div>
</div>


<script>
    require([
        "@nextgisweb/gui/react-app",
        "@nextgisweb/pyramid/layout",
        "@nextgisweb/resource/resources-filter",
    ], function (reactApp, layout, resourcesFilter) {
        reactApp.default(layout.Avatar, {}, document.getElementById("avatar"));
        reactApp.default(layout.Menu, {}, document.getElementById("menu"));

        %if not hide_resource_filter:
        reactApp.default(resourcesFilter.default, {}, document.getElementById("resourcesFilter"));
        %endif
    });
</script>
