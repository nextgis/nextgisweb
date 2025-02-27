<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <style type="text/css">
        body, html {
            min-width: 0 !important; width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden;
        }
    </style>
</%def>

<div id="display" style="width: 100%; height: 100%"></div>

<script type="text/javascript">
    ngwEntry("@nextgisweb/gui/react-boot").then(({ default: reactBoot}) => {
        const mainDisplayUrl = ${json_js(request.route_url('webmap.display', id=obj.id) + "?" + request.query_string)};
        reactBoot(
            "@nextgisweb/webmap/display-tiny",
            { id: ${json_js(id)}, tinyConfig: { mainDisplayUrl: mainDisplayUrl }},
            "display"
        );
    });
</script>
