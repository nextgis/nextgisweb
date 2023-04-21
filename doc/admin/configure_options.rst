Configuration options
=====================

.. _ngwadmin_comp_opts_environment:

environment
-----------
``package.*`` (boolean) - Disable installed package by setting false.
``component.*`` (boolean) - Enable optional component by setting true. Or disable component by setting false.
``logging.level`` (text, default: ``WARNING``) - Default logging level which is set to root logger.
``logging.critical`` (list<text>, default: ````) - Loggers which level set to CRITICAL.
``logging.error`` (list<text>, default: ````) - Loggers which level set to ERROR.
``logging.warning`` (list<text>, default: ````) - Loggers which level set to WARNING.
``logging.info`` (list<text>, default: ````) - Loggers which level set to INFO.
``logging.debug`` (list<text>, default: ````) - Loggers which level set to DEBUG.
``logging.timestamp`` (boolean, default: ``false``) - Print timestamps in log records or not.
``logger.*`` (text) - Set logging level of the specific logger in the following format: qualified_name:level. Where qualified_name is a dotted python logger name, nextgisweb.env for example. Any key name can be used and it affects nothing. But can be used when overriding options.
``logger.waitress`` (text, default: ``waitress:error``) - By default waitress (builtin HTTP server) logger level is set to ERROR. It's possible to override this setting here.
``distribution.name`` (text)
``distribution.description`` (text)
``distribution.version`` (text)
``distribution.date`` (text)

.. _ngwadmin_comp_opts_core:

core
----
``database.host`` (text, default: ``localhost``)
``database.port`` (integer, default: ``5432``)
``database.name`` (text, default: ``nextgisweb``)
``database.user`` (text, default: ``nextgisweb``)
``database.password`` (text)
``database.pwfile`` (text)
``database.connect_timeout`` (timedelta, default: ``5``)
``database.lock_timeout`` (timedelta, default: ``30``)
``database.pool.pre_ping`` (boolean, default: ``false``) - Test connections for liveness upon each checkout.
``database.pool.recycle`` (timedelta) - Recycle connections after the given time delta.
``test.database.host`` (text)
``test.database.port`` (integer)
``test.database.name`` (text)
``test.database.user`` (text)
``test.database.password`` (text)
``sdir`` (text, required) - Path to filesytem data storage where data stored along with database. Other components file_upload create subdirectories in it.
``backup.path`` (text) - Path to directory in filesystem where backup created if target destination is not specified.
``backup.filename`` (text, default: ``%Y%m%d-%H%M%S.ngwbackup``) - File name template (passed to strftime) for filename in backup.path if backup target destination is not specified.
``backup.tmpdir`` (text) - Temporary directory used for backup integrity and archive packing/unpacking.
``storage.enabled`` (boolean, default: ``false``)
``storage.limit`` (size_in_bytes) - Storage limit.
``packages.ignore`` (text) - Deprecated, use environment package.* option instead.
``components.ignore`` (text) - Deperected, use environment component.* option instead.
``healthcheck.free_space`` (float, default: ``10``) - Free space check during healthcheck in percent (0 for don't check).
``healthcheck.free_inodes`` (float, default: ``10``) - Free inodes check during healthcheck in percent (0 for don't check).
``locale.default`` (text, default: ``en``)
``locale.available`` (list<text>)
``locale.external_path`` (text)
``locale.poeditor.project_id`` (text)
``locale.poeditor.api_token`` (text)
``locale.contribute_url`` (text)
``support_url`` (text, default: ``https://nextgis.com/contact/``)
``provision.instance_id`` (text)
``provision.system.title`` (text)
``debug`` (boolean, default: ``false``) - Enable additional debug tools.

.. _ngwadmin_comp_opts_pyramid:

pyramid
-------
``help_page.enabled`` (boolean, default: ``true``)
``help_page.url`` (text, default: ``https://nextgis.com/redirect/{lang}/help/``)
``favicon`` (text, default: ``/opt/ngw/env/lib/python3.8/site-packages/nextgisweb/pyramid/asset/favicon.ico``)
``company_url`` (text, default: ``https://nextgis.com``)
``desktop_gis_example`` (text, default: ``NextGIS QGIS``)
``nextgis_external_docs_links`` (text, default: ``True``)
``backup.download`` (boolean, default: ``false``)
``session.cookie.name`` (text, default: ``ngw_sid``) - Session cookie name
``session.cookie.max_age`` (timedelta, default: ``7d``) - Session cookie max_age
``session.activity_delta`` (timedelta, default: ``10m``) - Session last activity update time delta.
``static_key`` (text)
``response_buffering`` (boolean) - Does the reverse proxy server in front of NextGIS Web use output buffering or not? It's enabled by default in Nginx, but it's better let NextGIS Web know about it.
``x_accel_buffering`` (boolean, default: ``false``) - Allow usage of X-Accel-Buffering header to control output buffering as it's done in Nginx. See docs on proxy_buffering directive for ngx_http_proxy module for details.
``debugtoolbar.enabled`` (boolean)
``debugtoolbar.hosts`` (text)
``legacy_locale_switcher`` (boolean, default: ``false``)
``lunkwill.enabled`` (boolean)
``lunkwill.host`` (text)
``lunkwill.port`` (integer)
``compression.algorithms`` (list<text>, default: ``br, gzip``)
``uacompat.enabled`` (boolean, default: ``true``)
``uacompat.chrome`` (int | bool, default: ``94``)
``uacompat.safari`` (int | bool, default: ``14``)
``uacompat.edge`` (int | bool, default: ``94``)
``uacompat.firefox`` (int | bool, default: ``91``)
``uacompat.opera`` (int | bool, default: ``76``)
``uacompat.ie`` (int | bool, default: ``false``)

.. _ngwadmin_comp_opts_auth:

auth
----
``register`` (boolean, default: ``false``) - Allow user registration.
``alink`` (boolean, default: ``false``) - Allow authentication via link.
``login_route_name`` (text, default: ``auth.login``) - Name of route for login page.
``logout_route_name`` (text, default: ``auth.logout``) - Name of route for logout page.
``activity_delta`` (timedelta, default: ``10m``) - User last activity update time delta.
``user_limit`` (integer) - Limit of enabled users
``provision.administrator.password`` (text, default: ``admin``)
``provision.administrator.oauth_subject`` (text)
``oauth.enabled`` (boolean, default: ``false``) - Enable OAuth authentication.
``oauth.default`` (boolean, default: ``false``) - Use OAuth authentication by default. Unauthenticated user viewing forbidden page will be redirected to OAuth server without showing login dialog. Login dialog will be available at /login URL.
``oauth.register`` (boolean, default: ``true``) - Allow registering new users via OAuth.
``oauth.local_auth`` (boolean, default: ``true``) - Allow authentication with local password for OAuth users.
``oauth.bind`` (boolean, default: ``true``) - Allow binding local user to OAuth user.
``oauth.scope`` (list<text>) - OAuth scopes
``oauth.client.id`` (text) - OAuth client ID
``oauth.client.secret`` (text) - OAuth client secret
``oauth.server.type`` (text) - OAuth server: nextgisid or keycloak (requires base URL).
``oauth.server.base_url`` (text) - OAuth server base URL. For NextGIS ID - https://nextgisid, for Keycloak - https://keycloak/auth/realms/master.
``oauth.server.display_name`` (text, default: ``OAuth``)
``oauth.server.authorization_code`` (boolean, default: ``true``) - Use authorization code grant type.
``oauth.server.password`` (boolean, default: ``false``) - Use password grant type.
``oauth.server.token_endpoint`` (text) - OAuth token endpoint URL.
``oauth.server.token_method`` (text, default: ``POST``) - Workaround for NGID OAuth implementation.
``oauth.server.introspection_endpoint`` (text) - OAuth token introspection endpoint URL.
``oauth.server.introspection_method`` (text, default: ``POST``) - Workaround for NGID OAuth implementation.
``oauth.server.auth_endpoint`` (text) - OAuth authorization code endpoint URL.
``oauth.server.authorization_header`` (text) - Add Authorization HTTP header to requests to OAuth server.
``oauth.server.refresh_expires_in`` (timedelta, default: ``7d``) - Default refresh token expiration (if not set by OAuth server).
``oauth.server.logout_endpoint`` (text) - OAuth logout endpoint URL.
``oauth.profile.endpoint`` (text) - OpenID Connect endpoint URL
``oauth.profile.subject.attr`` (text, default: ``sub``) - OAuth profile subject identifier
``oauth.profile.keyname.attr`` (text, default: ``preferred_username``) - OAuth profile keyname (user name)
``oauth.profile.keyname.no_update`` (boolean, default: ``false``) - Turn off keyname secondary synchronization
``oauth.profile.display_name.attr`` (text, default: ``name``) - OAuth profile display name
``oauth.profile.display_name.no_update`` (boolean, default: ``false``) - Turn off display_name secondary synchronization
``oauth.profile.member_of.attr`` (text) - OAuth group attribute used for automatic group assignment. Users get membership in groups with keynames that match the values of the attribute and have OAuth mapping flag. Supports dots and {client_id} substitution (like 'resource_access.{client_id}.roles' for Keycloak integration).
``oauth.profile.sync_timedelta`` (timedelta, default: ``5m``) - Minimum time delta between profile synchronization with OAuth server.
``oauth.timeout`` (timedelta, default: ``15``) - OAuth server request timeout.
``policy.local.lifetime`` (timedelta, default: ``1d``) - Local authentication lifetime.
``policy.local.refresh`` (timedelta, default: ``1h``) - Refresh local authentication lifetime interval.

.. _ngwadmin_comp_opts_resource:

resource
--------
``disabled_cls`` (list<text>, default: ````) - Resource classes disabled for creation.
``disable.*`` (boolean, default: ``false``) - Disable creation of specific resources.
``quota.limit`` (integer)
``quota.resource_cls`` (list<text>)
``quota.resource_by_cls`` (text)

.. _ngwadmin_comp_opts_spatial_ref_sys:

spatial_ref_sys
---------------
``catalog.enabled`` (boolean, default: ``false``)
``catalog.url`` (text)
``catalog.timeout`` (timedelta, default: ``15``) - Catalog request timeout.
``catalog.coordinates_search`` (boolean, default: ``false``)

.. _ngwadmin_comp_opts_webmap:

webmap
------
``basemaps`` (text, default: ``/opt/ngw/env/lib/python3.8/site-packages/nextgisweb/webmap/basemaps.json``) - Basemaps description file.
``annotation`` (boolean, default: ``true``) - Turn on / off annotations.
``enable_social_networks`` (boolean, default: ``false``)
``check_origin`` (boolean, default: ``false``) - Check iframe Referer header.

.. _ngwadmin_comp_opts_render:

render
------
``check_origin`` (boolean, default: ``false``) - Check request Origin header.
``tile_cache.enabled`` (boolean, default: ``true``)
``tile_cache.track_changes`` (boolean, default: ``false``)
``tile_cache.seed`` (boolean, default: ``false``)
``legend_symbols_section`` (boolean, default: ``false``)

.. _ngwadmin_comp_opts_feature_layer:

feature_layer
-------------
``export.limit`` (integer) - The export limit

.. _ngwadmin_comp_opts_file_storage:

file_storage
------------
``path`` (text)
``cleanup_keep_interval`` (timedelta, default: ``2d``)

.. _ngwadmin_comp_opts_svg_marker_library:

svg_marker_library
------------------
``path`` (list<text>, default: ``/opt/ngw/env/lib/python3.8/site-packages/nextgisweb/svg_marker_library/preset/``) - Search paths for SVG files.

.. _ngwadmin_comp_opts_sentry:

sentry
------
``dsn`` (text)
``environment`` (text)
``shutdown_timeout`` (integer, default: ``30``)

.. _ngwadmin_comp_opts_jsrealm:

jsrealm
-------
``dist_path`` (text, default: ``dist``)

.. _ngwadmin_comp_opts_vector_layer:

vector_layer
------------
``show_create_mode`` (boolean, default: ``false``)

.. _ngwadmin_comp_opts_postgis:

postgis
-------
``connect_timeout`` (timedelta, default: ``15``)
``statement_timeout`` (timedelta, default: ``15``)

.. _ngwadmin_comp_opts_raster_layer:

raster_layer
------------
``cog_enabled`` (boolean, default: ``true``)
``size_limit`` (size_in_bytes)

.. _ngwadmin_comp_opts_wfsclient:

wfsclient
---------
``user_agent`` (text, default: ``NextGIS Web``)
``timeout`` (timedelta, default: ``1m``)

.. _ngwadmin_comp_opts_wmsclient:

wmsclient
---------
``user_agent`` (text, default: ``NextGIS Web``)
``timeout`` (timedelta, default: ``15``) - WMS request timeout.

.. _ngwadmin_comp_opts_tmsclient:

tmsclient
---------
``nextgis_geoservices.layers`` (text, default: ``https://geoservices.nextgis.com/config/maps``)
``nextgis_geoservices.url_template`` (text, default: ``https://geoservices.nextgis.com/raster/{layer}/{z}/{x}/{y}.png``)
``user_agent`` (text, default: ``NextGIS Web``)
``timeout`` (timedelta, default: ``15``)

.. _ngwadmin_comp_opts_file_upload:

file_upload
-----------
``path`` (text)
``max_size`` (size_in_bytes, default: ``8G``)
``tus.enabled`` (boolean, default: ``true``)
``tus.chunk_size.default`` (size_in_bytes, default: ``16M``)
``tus.chunk_size.minimum`` (size_in_bytes, default: ``1M``)

.. _ngwadmin_comp_opts_audit:

audit
-----
``enabled`` (boolean, default: ``false``)
``elasticsearch.host`` (text)
``elasticsearch.port`` (integer, default: ``9200``)
``elasticsearch.index.prefix`` (text, default: ``nextgisweb-audit``)
``elasticsearch.index.suffix`` (text, default: ``%Y.%m``)
``file`` (text) - Log events in ndjson format
``request_method.include`` (list<text>) - Log only given request methods
``request_method.exclude`` (list<text>) - Don't log given request methods
``request_path.include`` (list<text>) - Log only given request path prefixes
``request_path.exclude`` (list<text>) - Don't log given request path prefixes
