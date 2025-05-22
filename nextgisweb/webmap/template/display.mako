<%! from nextgisweb.gui.view import REACT_BOOT_JSENTRY %>

<%inherit file='nextgisweb:pyramid/template/base.mako' />

<div id="webmap-wrapper" class="webmap-wrapper">
    <div id="display" class="webmap-display" style="width: 100%; height: 100%" />
</div>

<script type="text/javascript">
    ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then(({ default: reactBoot}) => {
        reactBoot(
            ${json_js(entrypoint)},
            { id: ${json_js(id)}, title: ${json_js(title)} },
            "display",
            { name: "DisplayLoader" }
        );
    });
</script>

