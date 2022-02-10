<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%! import json %>

<div id='root'></div>

<script type="text/javascript">
    require([
        ${entrypoint | json.dumps},
        "@nextgisweb/gui/react-app",
    ], function (comp, reactApp) {
        var props = ${ (props if props else {}) | json.dumps, n };

        reactApp.default(
            comp.default, props,
            document.getElementById('root')
        );
    });
</script>