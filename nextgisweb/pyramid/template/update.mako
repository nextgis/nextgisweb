<%
    ngupdate_url = request.env.ngupdate_url
    distr_opts = request.env.options.with_prefix('distribution')
%>
%if ngupdate_url != '':
<script type="text/javascript">
require([
    "dojo/dom-construct",
    "dojo/query",
    "dojo/request/xhr",
    "ngw/route",
    "dojo/domReady!"
], function (
    domConstruct,
    query,
    xhr,
    route,
) {
    var isSysInfo =
    %if request.path == request.route_path('pyramid.control_panel.sysinfo'):
        true
    %else:
        false
    %endif
    ;

    var timeout = isSysInfo ? 0 : 3 * 60 * 1000;

    function check_update () {
        xhr.get(route.pyramid.check_update(), {
            handleAs: "json",
        })
        %if request.user.is_administrator:
            .then(function (data) {
                if (data.has_update) {
                    var list = query("#rightMenu .list")[0];
                    domConstruct.create("a", {
                        class: "list__item",
                        innerHTML: "New update available",
                        href: route.pyramid.control_panel.sysinfo(),
                    }, list);

                    query(".has-update-only").forEach(function (element) {
                        element.style.display = "inherit";
                    });
                }
            })
        %endif
        ;
    }

    window.setTimeout(check_update, timeout);
});
</script>
%endif
