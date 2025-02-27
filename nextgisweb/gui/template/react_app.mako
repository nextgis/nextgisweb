<%! from nextgisweb.gui.view import REACT_BOOT_JSENTRY %>

<%inherit file='nextgisweb:pyramid/template/base.mako' />

<script type="text/javascript">
    ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then(({ default: reactBoot}) => {
        reactBoot(
            ${json_js(entrypoint)},
            ${json_js(props if props else {})},
            (comp) => comp.targetElementId || 'content'
        );
    });
</script>