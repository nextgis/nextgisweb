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


<%include file="nextgisweb:pyramid/template/header.mako" />

<div id="webmap-wrapper" class="webmap-wrapper">

    <div id="display"
         class="webmap-display"
        data-dojo-type="ngw-webmap/Display"
        data-dojo-props="config: displayConfig"
        style="width: 100%; height: 100%">
    </div>

</div>

<script type="text/javascript">
    require(["dojo/dom", "dojo/dom-style", "dojo/dom-geometry", "dojo/on", "dojo/domReady!"],
    function (dom, domStyle, domGeom, on) {
        var webmapWrapper = dom.byId("webmap-wrapper"),
            header = dom.byId("header");

        function resize() {
            var height = domGeom.getMarginBox(header, domStyle.getComputedStyle(header)).h;
            domStyle.set(webmapWrapper, "top", height + "px");
        }

        setTimeout(resize, 500) // timeout for a font rendering
        on(window, 'resize', resize);
    });

</script>