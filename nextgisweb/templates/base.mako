<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<% import json %>
<html>

<head>
  <title>

    %if hasattr(self, 'title'):
        ${self.title()} :: 
    %endif

    ${request.env.core.settings['system.name']}

  </title>

  <link rel="stylesheet" href="${request.static_url('nextgisweb:static/blueprint/screen.css')}" type="text/css" media="screen, projection" />
  <link rel="stylesheet" href="${request.static_url('nextgisweb:static/css/default.css')}" type="text/css" media="screen, projection" />
  <link rel="stylesheet" href="${request.static_url('nextgisweb:static/css/icon.css')}" type="text/css" media="screen, projection" />
 
  <link rel="stylesheet" href="${request.route_url('amd_package', subpath='dijit/themes/claro/claro.css')}" media="screen" />
  <link rel="stylesheet" href="${request.route_url('amd_package', subpath='cbtree/themes/claro/claro.css')}" media="screen" />

  <script type="text/javascript">
    var application_url = ${request.application_url | json.dumps};

    var ngwConfig = {
      applicationUrl: ${request.application_url | json.dumps, n},
      assetUrl: ${request.static_url('nextgisweb:static/') | json.dumps, n },
      amdUrl: ${request.route_url('amd_package', subpath="") | json.dumps, n}
    };

    var dojoConfig = {
      async: true,
      isDebug: true,
      baseUrl: ${request.route_url('amd_package', subpath="dojo") | json.dumps, n}
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

  <div class="container">
    <div class="span-24 header caption">
      ${request.env.core.settings['system.full_name']}
    </div>

    <ul class="span-24 menu">
      <li><a href="${request.route_url('webmap.browse')}">Веб-карты</a></li>
      <li><a href="${request.route_url('layer')}">Слои</a></li>

      %if request.user.is_administrator:
        <li><a href="${request.route_url('pyramid.control_panel')}">Панель управления</a></li>
      %endif

      <li style="float: right;">
      %if request.user.keyname == 'guest':
          <a href="${request.route_url('auth.login')}">Вход</a>
      %else:
          ${request.user} [<a href="${request.route_url('auth.logout')}">выход</a>]
      %endif
      </li>
    </ul>

    <% from bunch import Bunch %>
    %if obj and hasattr(obj,'__dynmenu__'):
        <%
            has_dynmenu = True
            dynmenu, dynmenu_kwargs = (obj.__dynmenu__, Bunch(obj=obj, request=request))
        %>
    %elif 'dynmenu' in context.keys():
        <%
            has_dynmenu = True
            dynmenu, dynmenu_kwargs = (context['dynmenu'], context['dynmenu_kwargs'])
        %>
    %else:
        <% has_dynmenu = False %>
    %endif
    
    <div class="span-${18 if has_dynmenu else 24}">
        ${next.body()}
    </div>

    %if has_dynmenu:
    <div class="span-6 last panel">
        <%include file="dynmenu.mako" args="dynmenu=dynmenu, args=dynmenu_kwargs" />
    </div>
    %endif

  </div>

  %else:
  
    ${next.body()}
  
  %endif

</body>

</html>