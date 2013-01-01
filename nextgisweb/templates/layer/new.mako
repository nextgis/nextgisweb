<%inherit file='../obj.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        var formArgs = ${dict(
            widgetModules=widget.widget_modules(),
        ) | json.dumps, n};

        require(["dojo/parser"], function (parser) {
            parser.parse();
        });
    </script>
</%def>

<% import json %>


<div data-dojo-id="form"
    data-dojo-type="layer/Form"
    data-dojo-props="widgetModules: formArgs.widgetModules">
</div>

<div data-dojo-type="dijit/form/Button">Добавить
    <script type="dojo/on" data-dojo-event="click">
        require(["dojo/request/xhr", "dojo/json"], function (xhr, json) {
            xhr.post("", {
                handleAs: "json",
                data: json.stringify(form.get("value")),
                headers: {
                    "Content-Type": "application/json"
                }
            }).then( function (data) {
                window.location = data.url;
            });
        });
    </script>
</div>
