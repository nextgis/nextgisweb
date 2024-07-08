<% opts = request.env.sentry.options.with_prefix("js") %>
<% dsn = opts["dsn"] %>

%if dsn:
    <% route = request.matched_route %>
    <% init_opts = dict(dsn=dsn, routeName=route.name if route else None) %>
    <script type="text/javascript">
        require(["@nextgisweb/sentry/init"], function ({ init }) {
            init(${json_js(init_opts)});
        });
    </script>
%endif