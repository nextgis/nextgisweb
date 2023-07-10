<%! from nextgisweb.auth.policy import AuthProvider %>

<%
    distr_opts = request.env.options.with_prefix('distribution')
    distribution = {
        k: distr_opts[k] for k in ('name', 'description', 'version', 'date')
    } if distr_opts.get('name') is not None else None

    packages = {p.name: p.version for p in request.env.packages.values()}

    try:
        user = request.user
        is_administrator = user.is_administrator
        is_guest = user.keyname == 'guest'
        user_id = user.id
        user_display_name = user.display_name

        if auth_result := request.environ.get('auth.result'):
            invitation_session = auth_result.prv == AuthProvider.INVITE
        else:
            invitation_session = False

    except Exception:
        # Something like InvalidCredentials
        is_administrator = False
        is_guest = True
        user_id = None
        user_display_name = None
        invitation_session = False

    ngwConfig = {
        "debug": request.env.core.debug,
        "applicationUrl": request.application_url,
        "amdUrl": request.static_url(),
        "staticUrl": request.static_url(),
        "staticKey": request.env.pyramid.static_key[1:],
        "distribution": distribution,
        "packages": packages,
        "instanceId": request.env.core.instance_id,
        "isAdministrator": is_administrator,
        "isGuest": is_guest,
        "userId": user_id,
        "userDisplayName": user_display_name,
        "invitationSession": invitation_session,
        "locale": request.locale_name,
    }

    if is_guest:
        ngwConfig['loginUrl'] = request.login_url()
    else:
        ngwConfig['logoutUrl'] = request.route_url(request.env.auth.options['logout_route_name'])

    if request.env.ngupdate_url:
        ngwConfig['ngupdateUrl'] = request.env.ngupdate_url

    dojoConfig = {
        "async": True,
        "isDebug": True,
        "packages": [
            {"name": "@nextgisweb", "location": request.static_url('main/@nextgisweb')}
        ],
        "baseUrl": request.static_url('dojo'),
        "locale": request.locale_name,
        "aliases": [
            ['openlayers/ol', 'external-ol/ol'],
            # TODO: Remove in 4.5.0
            ['ngw/route', 'ngw-pyramid/route'],
            ['ngw-pyramid/ErrorDialog/ErrorDialog', 'ngw-pyramid/ErrorDialog'],
        ],
    }
%>

<script type="text/javascript">
    var ngwConfig = ${json_js(ngwConfig)};
    var dojoConfig = ${json_js(dojoConfig)};
</script>