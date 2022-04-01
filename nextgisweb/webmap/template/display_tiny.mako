<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="title()"><% return str(obj) %></%def>

<%def name="head()">
    <script type="text/javascript">
        var displayConfig = ${json_js(display_config)};
        var mainDisplayUrl = "${request.route_url('webmap.display', id=obj.id)}?${request.query_string | n}";

        require([
            "dojo/parser", "dojo/ready", "ngw-webmap/Display"
        ], function (
            parser, ready
        ) {
            ready(function() {
                parser.parse();
            });
        });
    </script>

    <style type="text/css">
        body, html {
            min-width: 0 !important; width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden;
        }
        div.dijitTabPaneWrapper.dijitTabContainerTop-container.dijitAlignCenter {
            border: none;
        }
    </style>
</%def>

<div data-dojo-id="display"
    data-dojo-type="ngw-webmap/ui/TinyDisplay/TinyDisplay"
    data-dojo-props="config: displayConfig"
    style="width: 100%; height: 100%">
</div>
