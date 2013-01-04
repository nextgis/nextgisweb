<%inherit file='../obj.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        var formParams = ${dict(widget.widget_params(), url="") | json.dumps, n};

        var form;

        require([
            "dojo/_base/declare",
            "dojo/ready",
            "ngw/CompositeWidget",
            "ngw/ObjectFormMixin",
            "ngw/CompositeTitlePaneMixin"
        ], function (declare, ready, Widget, ObjectFormMixin, LayoutMixin) {
            var FormClass = declare("", [Widget, ObjectFormMixin, LayoutMixin]);
            form = new FormClass(formParams);
            ready(function() {
                form.placeAt('form').startup();
            });
        });
    </script>
</%def>

<div id="form"></div>
