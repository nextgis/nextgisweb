<%inherit file='obj.mako' />

<%def name="head()">
    <script type="text/javascript">
        var formParams = ${json_js(dict(widget.widget_params(), url=""))};

        var form;

        require([
            "dojo/_base/declare",
            "dojo/ready",
            ${json_js(widget.widget_module())},
            "ngw-pyramid/modelWidget/FormMixin"
        ], function (declare, ready, Base, FormMixin) {
            var FormClass = declare([Base, FormMixin]);
            form = new FormClass(formParams);
            ready(function() {
                form.placeAt('form').startup();
            });
        });
    </script>
</%def>

<div id="form"></div>
