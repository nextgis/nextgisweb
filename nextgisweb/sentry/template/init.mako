<% opts = request.env.sentry.options.with_prefix("js") %>
<% dsn = opts["dsn"] %>

%if dsn:
    <% init_opts = dict(dsn=dsn) %>
    <script type="text/javascript">
        require(["@nextgisweb/sentry/init"], function ({ init }) {
            init(${json_js(init_opts)});
        });
    </script>
%endif