<!DOCTYPE HTML>
<%! from nextgisweb.pyramid.util import _ %>
<!--[if IE 8]>         <html class="lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html> <!--<![endif]-->
<%
    import os
    import re
    import json
    from bunch import Bunch
%>
<head>
    <% system_name = request.env.core.settings_get('core', 'system.full_name') %>

    <title>
        <% page_title = '' %>
        %if hasattr(self, 'title'):
            <% page_title += self.title() + ' | ' %>
        %endif

        <% page_title += system_name %>
        ${page_title}
    </title>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta property="og:title" content="${page_title}"/>
    <meta property="og:image" content="http://nextgis.ru/img/webgis-for-social.png"/>
    <meta property="og:description" content="${tr(_('Your Web GIS at nextgis.com'))}"/>
    <meta property="og:url" content="${request.url}"/>
    <meta property="fb:app_id" content="138386829910005"/>

    <link href="${request.route_url('pyramid.favicon')}"
        rel="shortcut icon" type="image/x-icon"/>
    <link href="${request.static_url('nextgisweb:static/css/pure-0.6.0-min.css')}"
        rel="stylesheet" type="text/css"/>
    <link href="${request.static_url('nextgisweb:static/css/default.css')}"
        rel="stylesheet" type="text/css" media="screen"/>
    <link href="${request.static_url('nextgisweb:static/css/layout.css')}"
        rel="stylesheet" type="text/css"/>   
    <link href="${request.static_url('nextgisweb:static/css/icon.css')}"
        rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.route_url('amd_package', subpath='dijit/themes/claro/claro.css')}"
        rel="stylesheet" media="screen"/>

    <link href="${request.route_url('pyramid.custom_css')}" rel="stylesheet" type="text/css"/>

    %if 'sentry_url' in request.env.pyramid.options:
        <%include file="nextgisweb:pyramid/template/sentry.mako" />
    %endif


    <script type="text/javascript">
        var ngwConfig = {
            applicationUrl: ${request.application_url | json.dumps, n},
            assetUrl: ${request.static_url('nextgisweb:static/') | json.dumps, n },
            amdUrl: ${request.route_url('amd_package', subpath="") | json.dumps, n}
        };

        var dojoConfig = {
            async: true,
            isDebug: true,
            packages: [
                {name: "jed", main: "jed", location: ${request.static_url('nextgisweb:static/jed/') | json.dumps, n }}
            ],
            baseUrl: ${request.route_url('amd_package', subpath="dojo") | json.dumps, n},
            locale: ${request.locale_name | json.dumps, n}
        };

        %if (hasattr(request, 'context') and hasattr(request.context, 'id')):
        var ngwResourceId = ${request.context.id};
        %endif
    </script>

    <script src="${request.route_url('amd_package', subpath='dojo/dojo.js')}"></script>

    %if hasattr(self, 'assets'):
        ${self.assets()}
    %endif

    %if hasattr(self, 'head'):
        ${self.head()}
    %endif

    %for a in request.amd_base:
        <script src="${request.route_url('amd_package', subpath='%s.js' % a)}"></script>
    %endfor

</head>

<body class="claro nextgis <%block name='body_class'/>">
    %if not custom_layout:
        <div class="layout ${'maxwidth' if maxwidth else ''}">
        
            <%include file="nextgisweb:pyramid/template/header.mako" args="title=system_name"/>
            
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

            <div class="content pure-g">
                <div class="content__inner pure-u-${"18-24" if has_dynmenu else "1"} expand">
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
                        <div class="pure-u-${'18-24' if (maxheight and has_dynmenu) else '1'} expand">
                            <div class="content__container container expand"> 
                                %if hasattr(next, 'body'):
                                    ${next.body()}
                                %endif  
                            </div>
                        </div>    
                    </div>
                </div>
                %if has_dynmenu:
                    <div class="sidebar-helper pure-u-6-24"></div>
                    <div class="sidebar pure-u-6-24">
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
