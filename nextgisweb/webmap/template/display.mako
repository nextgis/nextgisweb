<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%include file="nextgisweb:pyramid/template/header.mako" args="title=display_config['webmapTitle'],
    hide_resource_filter=True"/>

<div id="webmap-wrapper" class="webmap-wrapper">
    <div id="display" class="webmap-display" style="width: 100%; height: 100%">
    </div>
</div>

<script type="text/javascript">
    require(["ngw-webmap/Display"], function (Display) {
        const displayConfig = ${json_js(display_config)};
        new Display({ config: displayConfig })
            .placeAt(document.getElementById("display"))
            .startup();
    });
</script>

