<!DOCTYPE HTML>

<%!
    from types import SimpleNamespace
    from msgspec import NODEFAULT
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.pyramid.breadcrumb import breadcrumb_path
    from nextgisweb.pyramid.view import ICON_JSENTRY, LAYOUT_JSENTRY
%>

<%
    effective_title = None if title is UNDEFINED else title
    bcpath = list()
    if obj is not UNDEFINED:
        bcpath = breadcrumb_path(obj, request)
        if len(bcpath) > 0 and effective_title is None:
            effective_title = bcpath[-1].label
            bcpath = bcpath[:-1]

    system_name = request.env.core.system_full_name()
    head_title = (tr(effective_title) + " | " + system_name) if (effective_title is not None) else (system_name)
%>

<html>
<head>
    <title>${head_title}</title>
    <meta charset="utf-8">
    
    <%include
        file="nextgisweb:social/template/meta.mako"
        args="site_name=system_name, title=effective_title"
    />

    <link href="${request.route_url('pyramid.asset.favicon')}" rel="shortcut icon" type="image/x-icon" />
    <link href="${request.static_url('stylesheet/layout.css')}" rel="stylesheet" type="text/css" />

    <%
        custom_css_url = request.route_url('pyramid.asset.css', _query=dict(
            ckey=request.env.core.settings_get('pyramid', 'custom_css.ckey')))
    %>
    <link href="${custom_css_url}" rel="stylesheet" type="text/css"/>

    <%include file="nextgisweb:pyramid/template/client_config.mako" />
    <script src="${request.static_url('main/ngwEntry.js')}"></script>
    
    %if hasattr(self, 'head'):
        ${self.head()}
    %endif

    %for template in request.env.pyramid._template_include:
        <%include file="${template}"/>
    %endfor

    <script type="text/javascript">
        ngwEntry(${json_js(ICON_JSENTRY)});
    </script>

    <%include file="nextgisweb:pyramid/template/metrics.mako"/>
    <%
        try:
            include_head = request.env.core.settings_get('pyramid', 'include_head')
        except KeyError:
            include_head = ""
    %>
    ${include_head | n}
</head>

<%def name="render_dynmenu()">
    <%
        dynmenu_kwargs = SimpleNamespace(request=request)
        if (dynmenu := context.get("dynmenu", NODEFAULT)) is NODEFAULT:
            if obj and (dynmenu := getattr(obj, "__dynmenu__", NODEFAULT)) is not NODEFAULT:
                dynmenu_kwargs.obj = obj
    %>
    %if (dynmenu is not NODEFAULT) and dynmenu:
        <div class="ngw-pyramid-layout-sidebar">
            <%include
                file="nextgisweb:pyramid/template/dynmenu.mako"
                args="dynmenu=dynmenu, args=dynmenu_kwargs"
            />
        </div>
    %endif
</%def>

<body>
    %if not custom_layout:
        <%
            lclasses = ["ngw-pyramid-layout"]
            if maxwidth: lclasses += ["ngw-pyramid-layout-hstretch"]
            if maxheight: lclasses += ["ngw-pyramid-layout-vstretch"]
        %>
        <div class="${' '.join(lclasses)}">
            <%include file="nextgisweb:pyramid/template/header.mako" args="header=system_name"/>
            <div class="ngw-pyramid-layout-crow">
                <div class="ngw-pyramid-layout-mwrapper">
                    <div id="main" class="ngw-pyramid-layout-main">
                        %if len(bcpath) > 0:
                            <div id="breadcrumbs" class="ngw-pyramid-layout-breadcrumbs-stub"></div>
                            <script type="text/javascript">
                                Promise.all([
                                    ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then((m) => m.default),
                                    ngwEntry(${json_js(LAYOUT_JSENTRY)}),
                                ]).then(([reactBoot, {Breadcrumbs}]) => {
                                    const props = ${json_js({"items": bcpath})};
                                    reactBoot(Breadcrumbs,  props, document.getElementById("breadcrumbs"));
                                });
                            </script>
                        %endif

                        <h1 id="title" class="ngw-pyramid-layout-title">
                            ${tr(effective_title)}
                        </h1>

                        %if hasattr(next, 'body'):
                            <div id="content" class="content" style="width: 100%">
                                ${next.body()}
                            </div>
                        %endif
                    </div>
                </div>
                ${render_dynmenu()}
            </div>
        </div>
    %else:
        ${next.body()}
    %endif
</body>
</html>
