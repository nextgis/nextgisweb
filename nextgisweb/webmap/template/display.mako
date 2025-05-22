<%! from nextgisweb.gui.view import REACT_BOOT_JSENTRY %>

<%inherit file='nextgisweb:pyramid/template/base.mako' />

<script type="text/javascript">
    (() => {
        const element = document.createElement("div");
        const current = document.currentScript;
        current.parentNode.insertBefore(element, current.nextSibling);
        ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then(({ default: reactBoot}) => {
            reactBoot(
                ${json_js(entrypoint)},
                { id: ${json_js(id)}, title: ${json_js(title)} },
                element,
                { name: "DisplayLoader" }
            );
        });
    })();
</script>

