<%inherit file='../obj.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        var objData = ${ (obj.to_dict() if obj else dict()) | json.dumps, n};
        var objCreate = ${ True if create else False | json.dumps, n};
        var widgetConfig = ${ widget_config | json.dumps, n};
    </script>
</%def>

<% import json %>

<div data-dojo-type="style/Form" data-dojo-id="form" data-dojo-props="widgetModule: '${widget_module}', data: objData, config: widgetConfig, create: objCreate "></div>

<script>
    require(["dojo/parser"], function(parser) { 
        parser.parse();
    });

</script>