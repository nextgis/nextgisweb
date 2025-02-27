<%inherit file='nextgisweb:pyramid/template/base.mako' />

<script type="text/javascript">
    ngwEntry("@nextgisweb/gui/react-boot").then(({ default: reactBoot}) => {
        reactBoot(
            ${json_js(entrypoint)},
            ${json_js(props if props else {})},
            (comp) => comp.targetElementId || 'content'
        );
    });
</script>