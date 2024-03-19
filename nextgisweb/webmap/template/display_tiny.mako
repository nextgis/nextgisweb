<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <style type="text/css">
        body, html {
            min-width: 0 !important; width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden;
        }
        div.dijitTabPaneWrapper.dijitTabContainerTop-container.dijitAlignCenter {
            border: none;
        }
    </style>
</%def>

<div id="display" style="width: 100%; height: 100%"></div>

<script type="text/javascript">
    require(["ngw-webmap/Display"], function (Display) {
        const displayConfig = ${json_js(display_config)};
        const mainDisplayUrl = ${json_js(request.route_url('webmap.display', id=obj.id) + "?" + request.query_string)};
        const tinyConfig = {mainDisplayUrl};

        new Display({ config: displayConfig, tinyConfig })
            .placeAt(document.getElementById("display"))
            .startup();
    });
</script>
