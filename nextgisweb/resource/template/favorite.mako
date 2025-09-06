<%! from nextgisweb.resource.favorite.view import config_value %>

## Skip loading favorites in case of error. The "auth.user" key is added to the
## environment by accessing request.user in client_config.mako. If it's missing,
## it indicates an authentication failure.
%if error_json is UNDEFINED and "auth.user" in request.environ:
    <script type="text/javascript">
        ngwConfig.resourceFavorite = ${json_js(config_value(request))};
    </script>
%else:
    <script type="text/javascript">
        ngwConfig.resourceFavorite = null;
    </script>
%endif