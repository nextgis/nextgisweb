<%inherit file='../obj.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        var formParams = ${dict(widget.widget_params(), url="") | json.dumps, n};

        var form;

        require([
            "dojo/_base/declare",
            "dojo/ready",
            "ngw/modelWidget/Composite",
            "ngw/modelWidget/FormMixin",
            "ngw/modelWidget/CompositeTitlePaneMixin"
        ], function (declare, ready, Composite, FormMixin, CompositeTitlePaneMixin) {
            var FormClass = declare([Composite, FormMixin, CompositeTitlePaneMixin]);
            form = new FormClass(formParams);
            ready(function() {
                form.placeAt('form').startup();
            });
        });
    </script>
</%def>

<div id="form"></div>
