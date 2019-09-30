<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%!
import json
from pyramid.httpexceptions import HTTPNotFound
from nextgisweb.pyramid.util import _
from nextgisweb.pyramid.exception import json_error
%>

<div id="error-card"></div>

<script type="text/javascript">
    require([
        "ngw-pyramid/ErrorCard/ErrorCard",
        "ngw-pyramid/i18n!pyramid",
        "dojo/domReady!"
    ], function (
        ErrorCard,
        i18n
    ) {
        var error = ${json.dumps(json_error(request, err_info, exc, exc_info, debug=debug)) | n};
        var errorCard = new ErrorCard({
            error: error,
            errorTitle: error.title,
            message: error.message,
            detail: error.detail,
            mainActionText: i18n.gettext('Back to home'),
            mainActionUrl: '/'
        }).placeAt('error-card');

        errorCard.startup();
    });
</script>
