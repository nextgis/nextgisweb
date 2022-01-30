<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%! import json %>

<div id='root'></div>

<script type="text/javascript">
    require([
        ${entrypoint | json.dumps},
        "@nextgisweb/gui/react-app",
    ], function (comp, reactApp) {
        reactApp.default(comp.default, document.getElementById('root'));
    });
</script>