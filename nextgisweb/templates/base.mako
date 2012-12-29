<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%namespace file="action_panel.mako" import="render_action_panel" />
<% import json %>
<html>

<head>
  <title>Page title</title>

  <link rel="stylesheet" href="${request.static_url('nextgisweb:static/blueprint/screen.css')}" type="text/css" media="screen, projection" />
  <link rel="stylesheet" href="${request.static_url('nextgisweb:static/css/default.css')}" type="text/css" media="screen, projection" />
 
  <link rel="stylesheet" href="${request.route_url('amd_package', subpath='dijit/themes/claro/claro.css')}" media="screen" />
  <link rel="stylesheet" href="${request.route_url('amd_package', subpath='cbtree/themes/claro/claro.css')}" media="screen" />

  <script type="text/javascript">
    var application_url = ${request.application_url | json.dumps};
    var dojoConfig = {
      async: true,
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
      Геоинформационная система
    </div>

    <ul class="span-24 menu">
      <li><a href="${request.route_url('webmap.browse')}">Веб-карты</a></li>
      <li><a href="${request.route_url('layer')}">Слои</a></li>
      <li><a href="/user/">Пользователи</a></li>
      <li><a href="/group/">Группы</a></li>

      <li style="float: right;">
      %if request.user.keyname == 'anonymous':
          <a href="${request.route_url('auth.login')}">Вход</a>
      %else:
          ${request.user} [<a href="${request.route_url('auth.logout')}">выход</a>]
      %endif
      </li>
    </ul>

    <% has_action_panel = (action_panel or (obj and hasattr(obj,'__action_panel'))) %>

    <div class="span-${18 if has_action_panel else 24}">
        ${next.body()}
    </div>

    %if has_action_panel:
    <div class="span-6 last panel">
      %if action_panel:
        ${render_action_panel(action_panel)}
      %else:
        ${render_action_panel(obj.__action_panel(request))}
      %endif
    </div>
    %endif

  </div>

  %else:
  
    ${next.body()}
  
  %endif

</body>

</html>