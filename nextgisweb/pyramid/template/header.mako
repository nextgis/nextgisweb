<%! from nextgisweb.pyramid.util import _ %>

<%
    system_name = request.env.core.settings_get('core', 'system.full_name')
    has_logo = request.env.core.settings_exists('pyramid', 'logo') or \
        ('logo' in settings and os.path.isfile(settings['logo']))
%>

<div id="header" class="header container">
    <% settings = request.env.pyramid.settings %>
    <div class="header__right">
        <ul class="menu-list list-inline">
            <li class="menu-list__item"><a href="${request.route_url('resource.root')}">${tr(_('Resources'))}</a></li>
            %if request.user.is_administrator:
                <li class="menu-list__item"><a href="${request.route_url('pyramid.control_panel')}">${tr(_('Control panel'))}</a></li>
            %endif    
            
            <% help_page = request.env.pyramid.help_page.get(request.locale_name) %>
            %if help_page:
                <li class="menu-list__item">
                    %if re.match("^http[s]?", help_page):
                        <a href="${help_page}" target="_blank">
                    %else:
                        <a href="${request.route_url('pyramid.help_page')}">
                    %endif
                    ${tr(_('Help'))}</a>
                </li>
            %endif
        </ul>
        <ul class="user-menu-list list-inline">
            %if request.user.keyname == 'guest':
                <li class="user-menu-list__item"><a href="${request.route_url(login_route_name)}">${tr(_('Sign in'))}</a></li>
            %else:
                <li class="user user-menu-list__item">
                    <i class="icon-user"></i>
                    ${request.user}
                </li>
                <li class="sign-out user-menu-list__item"><a href="${request.route_url(logout_route_name)}">
                    <i class="icon-logout"></i>
                </a></li>
            %endif
        </ul>
        <ul class="lang-list list-inline">
            %for locale in request.env.core.locale_available:
                <li class="lang-list__item"><a href="${request.route_url('pyramid.locale', locale=locale, _query=dict(next=request.url))}">${locale.upper()}</a></li>
            %endfor
        </ul>
    </div>
    <div class="header__left">
        <a class="header__title" href="${request.application_url}">    
            %if has_logo:
                <div class="header__title__logo">
                    <img class="logo__pic" src="${request.route_url('pyramid.logo')}"/>
                </div>    
            %endif
            <div class="header__title__inner">
                ${system_name}
            </div>
        </a>
    </div>    
</div>
