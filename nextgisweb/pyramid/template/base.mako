<!DOCTYPE HTML>

<%!
    from bunch import Bunch
    from nextgisweb.pyramid.breadcrumb import breadcrumb_path
    from nextgisweb.pyramid.util import _
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

    <link href="${request.route_url('pyramid.favicon')}"
        rel="shortcut icon" type="image/x-icon"/>
    <link href="${request.route_url('jsrealm.dist', subpath='stylesheet/layout.css')}"
        rel="stylesheet" type="text/css"/>

    <%
        custom_css_url = request.route_url('pyramid.custom_css', _query=dict(
            ckey=request.env.core.settings_get('pyramid', 'custom_css.ckey')))
    %>
    <link href="${custom_css_url}" rel="stylesheet" type="text/css"/>

    <%include file="nextgisweb:pyramid/template/client_config.mako" />

    <script src="${request.route_url('amd_package', subpath='dojo/dojo.js')}"></script>
    <script src="${request.route_url('jsrealm.dist', subpath='main/chunk/runtime.js')}"></script>
    
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
        require(["@nextgisweb/pyramid/icon"]);
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
        <div class="layout ${'maxwidth' if maxwidth else ''}">

            <%include file="nextgisweb:pyramid/template/header.mako" args="title=system_name,
                hide_resource_filter=hasattr(self, 'hide_resource_filter')"/>

            %if obj and hasattr(obj,'__dynmenu__'):
                <%
                    has_dynmenu = True
                    dynmenu = obj.__dynmenu__
                    dynmenu_kwargs = Bunch(obj=obj, request=request)
                %>
            %elif 'dynmenu' in context.keys():
                <%
                    has_dynmenu = True
                    dynmenu = context['dynmenu']
                    dynmenu_kwargs = context.get('dynmenu_kwargs', Bunch(request=request))
                %>
            %else:
                <% has_dynmenu = False %>
            %endif

            <div class="content ${'content_with-sidebar' if has_dynmenu else ''}">
                <div class="content__inner expand">
                    <div id="title" class="title">
                        <div class="content__container container">
                            %if len(bcpath) > 0:
                                <div class="path">
                                    %for idx, bc in enumerate(bcpath):
                                        <span class="path__item">
                                            <a class="path__link" href="${bc.link}">
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
                            <div class="title-header">
                                <h1 class="txt">${tr(effective_title)}</h1>
                                %if hasattr(next, 'title_ext'):
                                    <div class="ext">${next.title_ext()}</div>
                                %endif
                            </div>
                        </div>
                    </div>
                    <div id="content-wrapper" class="content-wrapper ${'content-maxheight' if maxheight else ''}">
                        <div class="expand">
                            <div class="content__container container expand">
                                %if hasattr(next, 'body'):
                                    ${next.body()}
                                %endif
                            </div>
                        </div>
                    </div>
                </div>
                %if has_dynmenu:
                    <div class="sidebar-helper"></div>
                    <div class="sidebar">
                        <%include file="nextgisweb:pyramid/template/dynmenu.mako" args="dynmenu=dynmenu, args=dynmenu_kwargs" />
                    </div>
                %endif
            </div> <!--/.content-wrapper -->
        </div> <!--/.layout -->
    %else:

        ${next.body()}

    %endif

    %if maxheight:

        <script type="text/javascript">

            require(["dojo/dom", "dojo/dom-style", "dojo/dom-geometry", "dojo/on", "dojo/domReady!"],
            function (dom, domStyle, domGeom, on) {
                var content = dom.byId("content-wrapper"),
                    header = [ ];

                for (var id in {"header": true, "title": true}) {
                    var node = dom.byId(id);
                    if (node) { header.push(node) }
                }

                function resize() {
                    var h = 0;
                    for (var i = 0; i < header.length; i++) {
                        var n = header[i], cs = domStyle.getComputedStyle(n);
                        h = h + domGeom.getMarginBox(n, cs).h;
                    }
                    domStyle.set(content, "top", h + "px");
                }

                resize();

                on(window, 'resize', resize);

            });

        </script>

    %endif
</body>

</html>
