<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%! from nextgisweb.pyramid.util import _ %>
<html>
<%
    import os
    import json
    from bunch import Bunch
%>
<head>

    <title>
        %if hasattr(self, 'title'):
            ${self.title()} ::
        %endif

        ${request.env.core.settings['system.name']}
    </title>

    <link href="${request.static_url('nextgisweb:static/css/pure-0.6.0-min.css')}"
        rel="stylesheet" type="text/css"/>

    <link href="${request.static_url('nextgisweb:static/css/layout.css')}"
        rel="stylesheet" type="text/css"/>

    <link href="${request.static_url('nextgisweb:static/css/default.css')}"
        rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb:static/css/icon.css')}"
        rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.route_url('amd_package', subpath='dijit/themes/claro/claro.css')}"
        rel="stylesheet" media="screen"/>

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
    </script>

    <script src="${request.route_url('amd_package', subpath='dojo/dojo.js')}"></script>

    %if hasattr(self, 'assets'):
        ${self.assets()}
    %endif

    %if hasattr(self, 'head'):
        ${self.head()}
    %endif

</head>

<body class="claro">

    %if not custom_layout:

        <div id="header" class="header">

            <div class="home-menu pure-menu pure-menu-horizontal">

                <% settings = request.env.pyramid.settings %>
                %if 'logo' in settings and os.path.isfile(settings['logo']):
                    <img class="logo" src="${request.route_url('pyramid.logo')}"/>
                %endif

                <a class="pure-menu-heading" href="${request.application_url}" style="float:left;">
                    ${request.env.core.settings['system.full_name']}
                </a>

                <ul class="pure-menu-list">
                    <li class="pure-menu-item"><a href="${request.route_url('resource.root')}" class="pure-menu-link">${tr(_('Resources'))}</a></li>

                    <%
                        from nextgisweb.auth import UserDisabled
                        try:
                            suser = request.user
                            euser = suser
                        except UserDisabled as e:
                            suser = None
                            euser = e.user
                    %>

                    %if suser and suser.is_administrator:
                        <li class="pure-menu-item"><a href="${request.route_url('pyramid.control_panel')}" class="pure-menu-link">${tr(_('Control panel'))}</a></li>
                    %endif

                    %if suser and suser.keyname == 'guest':
                        <li class="pure-menu-item"><a href="${request.route_url('auth.login')}" class="pure-menu-link">${tr(_('Sign in'))}</a></li>
                    %else:
                        <li class="user pure-menu-item">${euser}</li>
                        <li class="pure-menu-item"><a href="${request.route_url('auth.logout')}" class="pure-menu-link">${tr(_('Sign out'))}</a></li>
                    %endif

                    %if request.env.pyramid.help_page is not None:
                        <li class="pure-menu-item"><a href="${request.route_url('pyramid.help_page')}" class="pure-menu-link">${tr(_('Help'))}</a></li>
                    %endif

                    %for locale in request.env.core.locale_available:
                        <li class="pure-menu-item"><a href="${request.route_url('pyramid.locale', locale=locale, _query=dict(next=request.url))}" class="pure-menu-link">${locale.upper()}</a></li>
                    %endfor
                </ul>
            </div>

        </div>

        %if hasattr(next, 'title_block'):
            <div id="title" class="title">
                ${next.title_block()}
            </div>
        %elif hasattr(next, 'title'):
            <div id="title" class="title">
                <h1>${next.title()}</h1>
            </div>
        %elif title:
            <div id="title" class="title">
                <h1>${tr(title)}</h1>
            </div>
        %endif

        <div id="content-wrapper"
            class="content-wrapper ${'maxwidth' if maxwidth else ''} ${'content-maxheight' if maxheight else ''}">

            <div class="content expand">

                <div class="pure-g expand">

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

                    <div class="pure-u-${"20-24" if has_dynmenu else "1"} expand">
                        %if hasattr(next, 'body'):
                            ${next.body()}
                        %endif
                    </div>

                    %if has_dynmenu:
                        <div class="pure-u-4-24"><div style="padding-left: 1em;">
                            <%include file="nextgisweb:pyramid/template/dynmenu.mako" args="dynmenu=dynmenu, args=dynmenu_kwargs" />
                        </div></div>
                    %endif

                </div>

            </div>

        </div>

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
