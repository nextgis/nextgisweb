<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="title()"><% return unicode(obj) %></%def>

<%def name="head()">
    <% import json %>

    <script type="text/javascript">
        var displayConfig = ${json.dumps(display_config, indent=4).replace('\n', '\n' + (8 * ' ')) | n};

        require([
            "dojo/parser",
            "dojo/ready",
            "ngw-webmap/Display"
        ], function (
            parser,
            ready
        ) {
            ready(function() {
                parser.parse();
            });
        });
    </script>
</%def>

<div data-dojo-id="display"
     class="webmap-display"
    data-dojo-type="ngw-webmap/Display"
    data-dojo-props="config: displayConfig"
    style="width: 100%; height: 100%">
</div>
