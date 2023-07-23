<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%include file="nextgisweb:pyramid/template/header.mako" args="title=display_config['webmapTitle'],
    hide_resource_filter=True"/>

<div id="webmap-wrapper" class="webmap-wrapper">
    <div id="display" class="webmap-display" style="width: 100%; height: 100%">
    </div>
</div>

<script type="text/javascript">
    var displayConfig = ${json_js(display_config)};
    require(["ngw-webmap/Display"], function (Display) {
        new Display({ config: displayConfig })
            .placeAt(document.getElementById("display"))
            .startup();
    });
</script>

<script type="text/javascript">
    require(["dojo/dom", "dojo/dom-style", "dojo/dom-geometry", "dojo/on", "dojo/domReady!"],
    function (dom, domStyle, domGeom, on) {
        var webmapWrapper = dom.byId("webmap-wrapper"),
            header = dom.byId("header");

        function resize() {
            var height = domGeom.getMarginBox(header, domStyle.getComputedStyle(header)).h;
            domStyle.set(webmapWrapper, "top", height + "px");
        }
        resize();
        on(window, 'resize', resize);
    });

</script>
