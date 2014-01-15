<%inherit file='../base.mako' />

<%def name="head()">
    <% import json %>

    <script type="text/javascript">
        var displayConfig = ${json.dumps(display_config, indent=4).replace('\n', '\n' + (8 * ' ')) | n};

        require(["dojo/parser"], function (parser) { parser.parse(); });
    </script>

    <style type="text/css">
        body, html { width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden; }
    </style>

</%def>

<div data-dojo-id="display"
    data-dojo-type="webmap/Display"
    data-dojo-props="config: displayConfig"
    style="width: 100%; height: 100%">
</div>

<div style="position: absolute; right: 0; top: 0">
    <a href="http://nextgis.ru/nextgis-web/" target="_blank">
        <img src="${request.static_url('nextgisweb:static/img/nextgis.png')}" />
    </a>
</div>
