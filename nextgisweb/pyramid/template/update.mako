<%
    ngupdate_url = request.env.ngupdate_url
%>
%if ngupdate_url != '':
<script type="text/javascript">
require([
    "@nextgisweb/pyramid/update",
    "dojo/domReady!"
], function (
    update,
) {
    var ngupdate_url = "${ngupdate_url}";
    var is_admin =
    %if request.user.is_administrator:
        true
    %else:
        false
    %endif
    ;

    update.init(ngupdate_url, is_admin);
});
</script>
%endif
