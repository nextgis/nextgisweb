<!DOCTYPE HTML>

<%!
    from types import SimpleNamespace
    from nextgisweb.pyramid.breadcrumb import breadcrumb_path
%>

<%namespace file="nextgisweb:pyramid/template/util.mako" import="icon_svg"/>

<%
    effective_title = None if title is UNDEFINED else title
    if hasattr(next, 'title'):
        new_title = next.title()
        effective_title = new_title if (new_title is not None) else effective_title

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

    <%include file="nextgisweb:social/template/meta.mako" args="title=head_title"/>

    <link href="${request.route_url('pyramid.favicon')}" rel="shortcut icon" type="image/x-icon" />
    <link href="${request.static_url('stylesheet/layout.css')}" rel="stylesheet" type="text/css" />

    <%
        custom_css_url = request.route_url('pyramid.custom_css', _query=dict(
            ckey=request.env.core.settings_get('pyramid', 'custom_css.ckey')))
    %>
    <link href="${custom_css_url}" rel="stylesheet" type="text/css"/>

    <%include file="nextgisweb:pyramid/template/client_config.mako" />

    <script src="${request.static_url('dojo/dojo.js')}"></script>
    <script src="${request.static_url('main/chunk/runtime.js')}"></script>
    
    %if hasattr(self, 'assets'):
        ${self.assets()}
    %endif

    %if hasattr(self, 'head'):
        ${self.head()}
    %endif

    %for template in request.env.pyramid._template_include:
        <%include file="${template}"/>
    %endfor

    <script type="text/javascript">
        require([
            "@nextgisweb/jsrealm/locale-loader!",
            "@nextgisweb/pyramid/icon",
        ]);
    </script>

    <%
        try:
            include_head = request.env.core.settings_get('pyramid', 'include_head')
        except KeyError:
            include_head = ""
    %>
    ${include_head | n}
</head>

<body class="claro nextgis <%block name='body_class'/>">
    %if not custom_layout:
        <%
            lclasses = ["ngw-pyramid-layout"]
            if maxwidth: lclasses += ["ngw-pyramid-layout-hstretch"]
            if maxheight: lclasses += ["ngw-pyramid-layout-vstretch"]
        %>
        <div class="${' '.join(lclasses)}">
            <%include
                file="nextgisweb:pyramid/template/header.mako"
                args="title=system_name, hide_resource_filter=hasattr(self, 'hide_resource_filter')"
            />

            %if obj and hasattr(obj,'__dynmenu__'):
                <%
                    has_dynmenu = True
                    dynmenu = obj.__dynmenu__
                    dynmenu_kwargs = SimpleNamespace(obj=obj, request=request)
                %>
            %elif 'dynmenu' in context.keys():
                <%
                    has_dynmenu = True
                    dynmenu = context['dynmenu']
                    dynmenu_kwargs = context.get('dynmenu_kwargs', SimpleNamespace(request=request))
                %>
            %else:
                <% has_dynmenu = False %>
            %endif

            <div class="ngw-pyramid-layout-crow">
                <div class="ngw-pyramid-layout-mwrapper">
                    <div class="ngw-pyramid-layout-main">
                        %if len(bcpath) > 0:
                            <div class="ngw-pyramid-layout-bcrumb">
                                %for idx, bc in enumerate(bcpath):
                                    <span>
                                        <a href="${bc.link}">
                                            %if bc.icon:
                                                ${icon_svg(bc.icon)}
                                            %endif
                                            %if bc.label:
                                                ${tr(bc.label)}
                                            %endif
                                        </a>
                                    </span>
                                %endfor
                            </div>
                        %endif

                        <h1 class="ngw-pyramid-layout-title">
                            ${tr(effective_title)}
                            %if hasattr(next, 'title_ext'):
                                <div class="ext">${next.title_ext()}</div>
                            %endif
                        </h1>

                        %if hasattr(next, 'body'):
                            <div id="content" class="content">
                                ${next.body()}
                            </div>
                        %endif
                    </div>
                </div>
                %if sidebar := getattr(next, 'sidebar', None):
                    <div class="ngw-pyramid-layout-sidebar">${sidebar()}</div>
                %elif has_dynmenu:
                    <div class="ngw-pyramid-layout-sidebar">
                        <%include
                            file="nextgisweb:pyramid/template/dynmenu.mako"
                            args="dynmenu=dynmenu, args=dynmenu_kwargs"
                        />
                    </div>
                %endif
            </div>
        </div>
    %else:
        ${next.body()}
    %endif
</body>
</html>
