<%page args="title"/>

<%!
    import os
    import re
    from nextgisweb.pyramid.util import _
%>

<%
    settings = request.env.pyramid.settings
    has_logo = request.env.core.settings_exists('pyramid', 'logo') or \
        ('logo' in settings and os.path.isfile(settings['logo']))
%>

<div id="header" class="header clearfix">
    <ul class="header-nav header__right">
        <li class="header-nav__item">
            %if request.user.keyname == 'guest':
                <a href="${request.route_url(login_route_name)}">${tr(_('Sign in'))}</a>
            %else:
                <div class="user-avatar" data-dojo-type="ngw-pyramid/user-avatar/UserAvatar"
                 data-dojo-props="userName: '${request.user}',
                                  logoutLink: '${request.route_url(logout_route_name)}'"></div>
            %endif
        </li>
        <li class="header-nav__item">
            %for locale in request.env.core.locale_available:
                %if locale != request.locale_name:
                    <a href="${request.route_url('pyramid.locale', locale=locale, _query=dict(next=request.url))}">${locale.upper()}</a>
                %endif
            %endfor
        </li>
        <li class="header-nav__item">
            <span id="rightMenuIcon" class="rightMenu-icon icon--link material-icons">menu</span>
        </li>
    </ul>
    <div class="header__left">
        <a class="header__title" href="${request.application_url}">
            <div class="header__title__logo">
            %if has_logo:
                <img class="logo__pic" src="${request.route_url('pyramid.logo')}"/>
            %else:
                <img class="logo__pic" src="${request.static_url('nextgisweb:static/img/nextgis_logo_s.svg')}"/>
            %endif
            </div>
            <div class="header__title__inner">
                ${title}
            </div>
        </a>
    </div>
</div>

<%
    items = []
    items.append({
        'text': 'Resources',
        'link': request.route_url('resource.root')
    })
    if request.user.is_administrator:
        items.append({
            'text': 'Control panel',
            'link': request.route_url('pyramid.control_panel')
        })
    if request.env.pyramid.help_page.get(request.locale_name):
        items.append({
            'text': 'Help',
            'link': request.route_url('pyramid.help_page')
        })
%>
<div id="rightMenu"
     data-dojo-type="ngw-pyramid/right-menu/RightMenu"
     data-dojo-props="items: ${items},
                      class: 'right-menu',
                      withOverlay: true,
                      loginLink: '${request.route_url(login_route_name)}',
                      %if (request.user.keyname != 'guest'):
                          user: '${request.user}',
                          logoutLink: '${request.route_url(logout_route_name)}'
                      %endif
                    "></div>
