<%
    ngupdate_url = request.env.ngupdate_url
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
        var distr_opts = ngwConfig.distribution;
        var query = { instance: ngwConfig.instance_id };
        if (distr_opts.name !== null) {
            query.distribution = distr_opts.name + ':' + distr_opts.version;
        }

        xhr.get("${ngupdate_url}/api/query", {
            handleAs: "json",
            query: query,
            headers: {"X-Requested-With": null}
        })
        %if request.user.is_administrator:
            .then(function (data) {
                var has_update = false;
                try {
                    has_update = data.distribution.status === "has_update";
                } catch {}

                if (has_update) {
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
