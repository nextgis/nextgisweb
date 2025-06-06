<!DOCTYPE HTML>

<%!
    from types import SimpleNamespace
    from nextgisweb.pyramid.breadcrumb import breadcrumb_path
    from nextgisweb.pyramid.view import ICON_JSENTRY, LAYOUT_JSENTRY
%>

<%
    if custom_layout is UNDEFINED and (c := getattr(next, "is_custom_layout", None)):
        effective_custom_layout = c()
    else:
        effective_custom_layout = custom_layout

    system_name = request.env.core.system_full_name()
    effective_title = None if title is UNDEFINED else title
    effective_header = system_name if header is UNDEFINED else header

    breadcrumbs = list()
    if obj is not UNDEFINED:
        breadcrumbs = breadcrumb_path(obj, request)
        if len(breadcrumbs) > 0 and effective_title is None:
            effective_title = breadcrumbs[-1].label
            breadcrumbs = breadcrumbs[:-1]

    head_title = (tr(effective_title) + " | " + system_name) if (effective_title is not None) else system_name
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

<body>
    %if not effective_custom_layout:
        <%
            lclasses = ["ngw-pyramid-layout"]
            if maxwidth: lclasses += ["ngw-pyramid-layout-hstretch"]
            if maxheight: lclasses += ["ngw-pyramid-layout-vstretch"]
        %>
        <div class="${' '.join(lclasses)}">
            <%include file="nextgisweb:pyramid/template/header.mako" args="header=effective_header"/>
            <div class="ngw-pyramid-layout-crow">
                <div class="ngw-pyramid-layout-mwrapper">
                    <div id="main" class="ngw-pyramid-layout-main">
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
            </div>
        </div>
    %else:
        ${next.body(
            obj=obj,
            title=effective_title,
            header=effective_header,
            breadcrumbs=breadcrumbs,
            maxwidth=maxwidth,
            maxheight=maxheight,
        )}
    %endif
</body>
</html>
