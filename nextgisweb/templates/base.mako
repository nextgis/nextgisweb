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

  <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/pure/0.4.2/pure-min.css">
  <link rel="stylesheet" href="${request.static_url('nextgisweb:static/css/layout.css')}" type="text/css"/>

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

<div class="header">
  <div class="home-menu pure-menu pure-menu-open pure-menu-horizontal">
    <a class="pure-menu-heading" href="${request.application_url}">${request.env.core.settings['system.full_name']}</a>
    <ul>
      <li><a href="${request.route_url('resource.root')}">Ресурсы</a></li>

      %if request.user.is_administrator:
        <li><a href="${request.route_url('pyramid.control_panel')}">Панель управления</a></li>
      %endif

      %if request.user.keyname == 'guest':
        <li><a href="${request.route_url('auth.login')}">Вход</a></li>
      %else:
        <li class="user">${request.user}</li>
        <li><a href="${request.route_url('auth.logout')}">Выход</a></li>
      %endif
    </ul>
  </div>
</div>

%if hasattr(next, 'title_block'):
  <div class="title">
    ${next.title_block()}
  </div>
%elif hasattr(next, 'title'):
  <div class="title">
    <h1>${next.title()}</h1>
  </div>
%elif title:
  <div class="title">
    <h1>${title}</h1>
  </div>
%endif

<div class="content-wrapper">

  <div class="content">

    <div class="pure-g">

    <% from bunch import Bunch %>
    %if obj and hasattr(obj,'__dynmenu__'):
        <%
            has_dynmenu = True
            dynmenu, dynmenu_kwargs = (obj.__dynmenu__, Bunch(obj=obj, request=request))
        %>
    %elif 'dynmenu' in context.keys():
        <%
            has_dynmenu = True
            dynmenu, dynmenu_kwargs = (
                context['dynmenu'],
                context.get('dynmenu_kwargs', Bunch(request=request))
            )
        %>
    %else:
        <% has_dynmenu = False %>
    %endif
    
    <div class="pure-u-${"20-24" if has_dynmenu else "1"}">
        %if hasattr(next, 'body'):
          ${next.body()}
        %endif
    </div>

    %if has_dynmenu:
    <div class="pure-u-4-24"><div style="padding-left: 1em;">
        <%include file="dynmenu.mako" args="dynmenu=dynmenu, args=dynmenu_kwargs" />
    </div></div>
    %endif

  </div>

  %else:
  
    ${next.body()}
  
  %endif

    </div>
  </div>
</div>


</body>

</html>