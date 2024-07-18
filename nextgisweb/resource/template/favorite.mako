<%! from nextgisweb.resource.favorite.view import config_value %>

%if error_json is UNDEFINED:
    <script type="text/javascript">
        ngwConfig.resourceFavorite = ${json_js(config_value(request))};
    </script>
%else:
    <script type="text/javascript">
        ngwConfig.resourceFavorite = null;
    </script>
%endif