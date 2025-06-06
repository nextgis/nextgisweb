<%inherit file='nextgisweb:pyramid/template/base.mako' />

<script type="text/javascript">
    (function () {
        const element = document.createElement("div");
        const current = document.currentScript;
        current.parentNode.insertBefore(element, current.nextSibling);

        ngwEntry(${json_js(entrypoint)}).then(({ default: runner }) => {
            runner(${(selected) | json_js}, element);
        });
    })();
</script>

