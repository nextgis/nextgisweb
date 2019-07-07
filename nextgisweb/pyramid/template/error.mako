<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%!
import json
from pyramid.httpexceptions import HTTPNotFound
from nextgisweb.pyramid.util import _
from nextgisweb.pyramid.exception import json_error
%>

<%def name="head()">
    <link href="${request.route_url('amd_package', subpath='ngw-pyramid/ErrorDialog.css')}" rel="stylesheet" type="text/css"/>
</%def>


<!-- Use dijit same layout as ngw-pyrami/ErrorDialog -->

<div class="dijitDialog">
    <div class="dijitDialogTitleBar">
        <span class="dijitDialogTitle">${tr(err_info.title) if hasattr(err_info, 'title') and err_info.title else ""}</span>
    </div>
    <div id="containerNode" class="dijitDialogPaneContent ngwPyramidErrorDialog">
        <div id="contentArea" class="dijitDialogPaneContentArea">
            %if hasattr(err_info, 'message') and err_info.message:
                <p>${tr(err_info.message)}</p>
            %endif
            %if hasattr(err_info, 'detail') and err_info.detail:
                <p>${tr(err_info.detail)}</p>
            %endif
        </div>
        <div id="actionBar" class="dijitDialogPaneActionBar">

        </div>
    </div>
</div>

<script type="text/javascript">
    require([
        "dojo/dom-style",
        "dojo/json",
        "dijit/form/Button",
        "ngw-pyramid/form/CodeMirror",
        "ngw-pyramid/i18n!resource",
        "dojo/domReady!"
    ], function (
        domStyle,
        json,
        Button,
        CodeMirror,
        i18n
    ) {
        var error = ${json.dumps(json_error(request, err_info, exc, exc_info, debug=debug)) | n};

        var technicalInfo = new CodeMirror({
            readonly: true,
            lineNumbers: true,
            autoHeight: true,
            lang: 'javascript',
            style: "display: none;",
            value: json.stringify(error, undefined, 2)
        }).placeAt("contentArea");
        technicalInfo.startup();

        new Button({
            label: i18n.gettext("Back"),
            class: "dijitButton--primary",
            onClick: function () {
                window.history.back();
            }
        }).placeAt("actionBar")

        new Button({
            label: i18n.gettext("Request support"),
            class: "dijitButton--default",
            style: "float: right; margin-left: 1ex;"
        }).placeAt("actionBar");

        new Button({
            label: i18n.gettext("Technical info"),
            class: "dijitButton--default",
            style: "float: right;",
            onClick: function () {
                domStyle.set(technicalInfo.domNode, "display", "block");
                technicalInfo.resize();
            }
        }).placeAt("actionBar");
    });
</script>
