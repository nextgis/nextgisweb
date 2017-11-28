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
            <a class="header__title-logo" href="${request.application_url}">
            %if has_logo:
                <img class="logo__pic" src="${request.route_url('pyramid.logo')}"/>
            %else:
                <img class="logo__pic" src="${request.static_url('nextgisweb:static/img/nextgis_logo_s.svg')}"/>
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
        %if request.user.keyname != 'guest':
            (new UserAvatar({
                userName: '${request.user}',
                logoutLink: '${request.route_url(logout_route_name)}'
            })).placeAt('userAvatar');
        %endif

        (new RightMenu({
            items: [
                {
                    "text": '${tr(_("Resources"))}',
                    "link": '${request.route_url("resource.root")}'
                }
            %if request.user.is_administrator:
                ,{
                    "text": '${tr(_("Control panel"))}',
                    "link": '${request.route_url("pyramid.control_panel")}'
                }
            %endif

            <% help_page = request.env.pyramid.help_page.get(request.locale_name) %>
            %if help_page:
                ,{
                    "text": '${tr(_("Help"))}',
                    %if re.match("^http[s]?", help_page):
                        "link": '${help_page}'
                    %else:
                        "link": '${request.route_url("pyramid.help_page")}'
                    %endif
                }
            %endif
            ],
            class: 'right-menu',
            withOverlay: true,
            loginLink: '${request.route_url(login_route_name)}',
            %if (request.user.keyname != 'guest'):
              user: '${request.user}',
              logoutLink: '${request.route_url(logout_route_name)}'
            %endif
        })).placeAt('rightMenu');
    });
</script>
