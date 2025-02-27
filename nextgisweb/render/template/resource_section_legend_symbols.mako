<div id="legendSymbols"></div>

<script type="text/javascript">
    ngwEntry("@nextgisweb/gui/react-boot").then(({ default: reactBoot}) => {
        reactBoot(
            "@nextgisweb/render/legend-symbols-widget",
            { resourceId: ${obj.id} },
            "legendSymbols"
        );
    });
</script>