<%!
    from pathlib import Path
    import nextgisweb.pyramid as m
    svglogo = None
%>

<%page args="title, hide_resource_filter=False"/>

<% return_url = request.GET['return'] if 'return' in request.GET else False %>
<div id="header" class="ngw-pyramid-layout-header">
    <a href="${return_url if return_url else request.application_url}">
        %if return_url:
            <img src="${request.static_url('asset/pyramid/return-button.svg')}"/>
        %elif request.env.core.settings_exists('pyramid', 'logo'):
            <% ckey = request.env.core.settings_get('pyramid', 'logo.ckey') %>
            <img src="${request.route_url('pyramid.asset.hlogo', _query=dict(ckey=ckey))}"/>
        %else:
            <%
                global svglogo
                if svglogo is None:
                    logo_path = Path(request.env.pyramid.options["logo"])
                    svglogo = Markup(logo_path.read_text())
            %>
            ${svglogo}
        %endif
    </a>
    <div class="text">${title}</div>
    <div class="container">
        %if not hide_resource_filter:
            <div class="header-resources-filter" id="resourcesFilter"></div>
        %endif
        <div id="avatar"></div>
        %if request.env.pyramid.options['legacy_locale_switcher']:
            <div>
                %for locale in request.env.core.locale_available:
                    %if locale != request.locale_name:
                        <a href="${request.route_url('pyramid.locale', locale=locale, _query=dict(next=request.url))}">${locale.upper()}</a>
                    %endif
                %endfor
            </div>
        %endif
        <div id="menu"></div>
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
        reactApp.default(resourcesFilter.default, {
            onChange: function(v, opt) {
                window.location.href = opt.url
            }
        }, document.getElementById("resourcesFilter"));
        %endif
    });
</script>
