<%page args="title"/>

<%!
    import os
    import re
    from six import text_type
    from nextgisweb.pyramid.util import _

%>

<%
    return_url = request.GET['return'] if 'return' in request.GET else false

    login_qs = dict()
    if request.matched_route is None or request.matched_route.name not in (login_route_name, logout_route_name):
        login_qs['next'] = request.url
    login_url = request.route_url(login_route_name, _query=login_qs)

    # Fetching user details may fail sometimes, especially in error handlers!
    try:
        user = request.user
        user_mode = 'guest' if user.keyname == 'guest' else (
            'administrator' if user.is_administrator else 'authorized')
        user_display_name = text_type(user)
    except Exception:
        user_mode = 'guest'
        user_display_name = None
%>

<div id="header" class="header clearfix">
    <ul class="header-nav header__right">
        <li class="header-nav__item">
            %if user_mode == 'guest':
                <a href="${login_url}">${tr(_('Sign in'))}</a>
            %else:
                <div class="user-avatar" id="userAvatar"></div>
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
        <div class="header__title">
            <a class="header__title-logo" href="${return_url if return_url else request.application_url}">
                %if return_url:
                    <img class="logo__pic" src="${request.static_url('nextgisweb:static/img/return-button.svg')}"/>
                %else:
                    <%
                        logo_url = request.route_url('pyramid.logo') if request.env.core.settings_exists('pyramid', 'logo') \
                            else request.static_url('nextgisweb:static/img/nextgis_logo_s.svg')
                    %>
                    <img class="logo__pic" src="${logo_url}"/>
                %endif
            </a>
            <div class="header__title__inner">
                ${title}
            </div>
        </div>
    </div>
</div>
<div id="rightMenu"></div>

<script>
    require([
        "ngw-pyramid/right-menu/RightMenu",
        "ngw-pyramid/user-avatar/UserAvatar"
    ], function (
        RightMenu, UserAvatar
    ) {
        %if user_mode != 'guest':
            (new UserAvatar({
                userName: '${user_display_name}',
                logoutLink: '${request.route_url(logout_route_name)}'
            })).placeAt('userAvatar');
        %endif

        (new RightMenu({
            items: [
                {
                    "text": '${tr(_("Resources"))}',
                    "link": '${request.route_url("resource.root")}'
                }
            %if user_mode == 'administrator':
                ,{
                    "text": '${tr(_("Control panel"))}',
                    "link": '${request.route_url("pyramid.control_panel")}'
                }
            %endif

            <% help_page_url = request.env.pyramid.help_page_url(request) %>
            %if help_page_url is not None:
                <% help_page_url = help_page_url.format(lang=request.locale_name) %>
                ,{
                    "text": '${tr(_("Help"))}',
                    "link": '${help_page_url}'
                }
            %endif
            ],
            class: 'right-menu',
            withOverlay: true,
            loginLink: '${login_url}',
            %if user_mode != 'guest':
              user: '${user_display_name}',
              logoutLink: '${request.route_url(logout_route_name)}'
            %endif
        })).placeAt('rightMenu');
    });
</script>
