<!DOCTYPE HTML>
<%! from nextgisweb.pyramid.util import _ %>
<html>
<%
    import os
    import re
    import json
    from bunch import Bunch

    from nextgisweb.pyramid.util import _
%>
<head>
    <% system_name = request.env.core.system_full_name() %>

    <title>
        <% page_title = '' %>
        %if hasattr(self, 'title'):
            <% page_title += self.title() + ' | ' %>
        %endif

        <% page_title += system_name %>
        ${page_title}
    </title>

    <meta charset="utf-8">

    <%include file="nextgisweb:social/template/meta.mako" args="title=page_title"/>

    <link href="${request.route_url('pyramid.favicon')}"
        rel="shortcut icon" type="image/x-icon"/>
    <link href="${request.route_url('jsrealm.dist', subpath='stylesheet/layout.css')}"
        rel="stylesheet" type="text/css"/>

    <link href="${request.route_url('pyramid.custom_css')}" rel="stylesheet" type="text/css"/>

    <%include file="nextgisweb:pyramid/template/client_config.mako" />

    <script type="text/javascript">
        %if (hasattr(request, 'context') and hasattr(request.context, 'id')):
        var ngwResourceId = ${request.context.id};
        %endif
    </script>

    <script src="${request.route_url('amd_package', subpath='dojo/dojo.js')}"></script>
    <script src="${request.route_url('jsrealm.dist', subpath='main/chunk/runtime.js')}"></script>
    
    %if hasattr(self, 'assets'):
        ${self.assets()}
    %endif

    %if hasattr(self, 'head'):
        ${self.head()}
    %endif

    %for a in request.amd_base:
        <script src="${request.route_url('amd_package', subpath='%s.js' % a)}"></script>
    %endfor

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
                            %if hasattr(next, 'title_block'):
                                ${next.title_block()}
                            %elif hasattr(next, 'title'):
                                <h1>${next.title()}</h1>
                            %elif title:
                                <h1>${tr(title)}</h1>
                            %endif
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
