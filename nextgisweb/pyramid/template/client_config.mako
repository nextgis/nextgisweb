<%!
    from nextgisweb.auth.policy import AuthProvider
    from nextgisweb.resource.home import user_group
%>

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
        contol_panel = is_administrator or len(user.effective_permissions) > 0
        user_id = user.id
        user_display_name = user.display_name

        if auth_result := request.environ.get('auth.result'):
            invitation_session = auth_result.prv == AuthProvider.INVITE
        else:
            invitation_session = False

        if request.env.resource.options["home.enabled"]:
            resource_home = user_group(user, create=False)
        else:
            resource_home = None

    except Exception:
        # Something like InvalidCredentials
        is_administrator = False
        is_guest = True
        contol_panel = False
        user_id = None
        user_display_name = None
        invitation_session = False
        resource_home = None

    ngwConfig = {
        "components": list(request.env.components.keys()),
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
        "controlPanel": contol_panel,
        "userId": user_id,
        "userDisplayName": user_display_name,
        "invitationSession": invitation_session,
        "resourceHome": dict(id=resource_home.id) if resource_home else None,
        "locale": request.locale_name,
    }

    if is_guest:
        ngwConfig['loginUrl'] = request.login_url()
    else:
        ngwConfig['logoutUrl'] = request.route_url(request.env.auth.options['logout_route_name'])

    if request.env.ngupdate_url:
        ngwConfig['ngupdateUrl'] = request.env.ngupdate_url
%>

<script type="text/javascript">
    var ngwConfig = ${json_js(ngwConfig)};
</script>