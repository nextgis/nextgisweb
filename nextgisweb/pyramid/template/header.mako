<%page args="title"/>

<%!
    import os
    import re
    from six import text_type
    from nextgisweb.pyramid.util import _
%>

<%
    return_url = request.GET['return'] if 'return' in request.GET else False
    login_url = request.login_url()

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
        %if request.env.pyramid.options['legacy_locale_switcher']:
            <li class="header-nav__item">
                %for locale in request.env.core.locale_available:
                    %if locale != request.locale_name:
                        <a href="${request.route_url('pyramid.locale', locale=locale, _query=dict(next=request.url))}">${locale.upper()}</a>
                    %endif
                %endfor
            </li>
        %endif
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
            %if user_mode != 'guest':
                ,{
                    "text": '${tr(_("User settings"))}',
                    "link": '${request.route_url("auth.user_settings")}'
                }
            %endif
            <% help_page_url = request.env.pyramid.help_page_url_view(request) %>
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
