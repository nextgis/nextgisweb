<%! from json import dumps %>
<%
    distr_opts = request.env.options.with_prefix('distribution')
    distribution = {
        k: distr_opts[k] for k in ('name', 'description', 'version', 'date')
    } if distr_opts.get('name') is not None else None

    packages = {p.name: p.version for p in request.env.packages.values()}

    try:
        is_administrator = request.user.is_administrator
    except Exception:
        # Something like InvalidCredentials
        is_administrator = False

    ngwConfig = {
        "debug": request.env.core.debug,
        "applicationUrl": request.application_url,
        "assetUrl": request.static_url('nextgisweb:static/'),
        "amdUrl": request.route_url('amd_package', subpath=""),
        "distUrl": request.route_url('jsrealm.dist', subpath=''),
        "distribution": distribution,
        "packages": packages,
        "instanceId": request.env.core.instance_id,
        "isAdministrator": is_administrator,
        "locale": request.locale_name,
    }

    if request.env.ngupdate_url:
        ngwConfig['ngupdateUrl'] = request.env.ngupdate_url

    dojoConfig = {
        "async": True,
        "isDebug": True,
        "packages": [
            {"name": "dist", "location": request.route_url('jsrealm.dist', subpath='')},
            {"name": "@nextgisweb", "location": request.route_url('jsrealm.dist', subpath='main/@nextgisweb')}
        ],
        "baseUrl": request.route_url('amd_package', subpath="dojo"),
        "locale": request.locale_name,
        "aliases": [
            ['ngw/route', 'ngw-pyramid/route'],
            ['openlayers/ol', 'dist/external-ol/ol'],
            ['ngw-pyramid/ErrorDialog/ErrorDialog', 'ngw-pyramid/ErrorDialog'],
            # Ready for removal
            ['ngw-pyramid/i18n', '@nextgisweb/pyramid/i18n'],
            ['ngw/dgrid/css', 'ngw-pyramid/nop'],
            ['ngw/load-json', '@nextgisweb/pyramid/api/load'],
            ['ngw/openlayers/layer/_Base', 'ngw-webmap/ol/layer/_Base'],
            ['ngw/openlayers/layer/Image', 'ngw-webmap/ol/layer/Image'],
            ['ngw/openlayers/layer/OSM', 'ngw-webmap/ol/layer/OSM'],
            ['ngw/openlayers/layer/Vector', 'ngw-webmap/ol/layer/Vector'],
            ['ngw/openlayers/layer/XYZ', 'ngw-webmap/ol/layer/XYZ'],
            ['ngw/openlayers/Map', 'ngw-webmap/ol/Map'],
            ['ngw/openlayers/Popup', 'ngw-webmap/ol/Popup'],
            ['ngw/settings', '@nextgisweb/pyramid/settings'],
            ['ngw/utils/make-singleton', 'ngw-pyramid/make-singleton'],
        ],
    }
%>

<script type="text/javascript">
    var ngwConfig = ${ ngwConfig | dumps, n };
    var dojoConfig = ${ dojoConfig | dumps, n };
</script>