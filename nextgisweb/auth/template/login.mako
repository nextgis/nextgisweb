<%inherit file="nextgisweb:pyramid/template/base.mako" />
<%! from nextgisweb.auth.util import _ %>
<script>
    require([
        "dojo/parser",
        "dojo/ready",
        "dijit/_WidgetBase",
        "dijit/TitlePane",
        "dijit/form/Button",
        "dojox/layout/TableContainer"
    ], function (
        parser,
        ready
    ) {
        ready(function() {
            parser.parse();
        });
    });
</script>


<div data-dojo-type="dijit/TitlePane"
    title="${tr(_('Authentication'))}"
    style="width: 400px">

<form data-dojo-type="dojox/layout/TableContainer"
    method="POST">

    <div data-dojo-type="dijit/_WidgetBase"
        data-dojo-props="label: '${tr(_('Login'))}'"
        style="width: 100%">

        <input name="login" style="width: 98%" />

    </div>

    <div data-dojo-type="dijit/_WidgetBase"
        data-dojo-props="label: '${tr(_('Password'))}'"
        style="width: 100%">
    
        <input name="password" type="password" style="width: 98%" />
    
    </div>


    <div data-dojo-type="dijit/_WidgetBase">

        <button data-dojo-type="dijit/form/Button" 
            type="submit" value="">
            ${tr(_('Sign in'))}

        </button>

    </div>
</form>

</div>
