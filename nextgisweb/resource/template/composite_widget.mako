<%inherit file='nextgisweb:templates/obj.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        require([
            "dojo/request/xhr",
            "@nextgisweb/pyramid/api",
            "ngw-resource/CompositeWidget",
            "dojo/domReady!"
        ], function (xhr, api, CompositeWidget) {
            xhr(api.routeURL('resource.widget'), {
                query: ${query | json.dumps, n},
                handleAs: 'json'
            }).then(function (data) {
                CompositeWidget.bootstrap(data).then(function (widget) {
                    widget.placeAt('widget').startup();
                });
            });
        });
    </script>
</%def>

<div id="widget" class="composite-widget" style="width: 100%; height: 100%;"></div>
