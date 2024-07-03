<%! from nextgisweb.resource.favorite.view import config_value %>
<script type="text/javascript">
    ngwConfig.resourceFavorite = ${json_js(config_value(request))};
</script>