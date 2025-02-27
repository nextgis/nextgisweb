<%! from nextgisweb.sentry.view import INIT_JSENTRY %>

%if bypass := request.environ.get("pyramid.uacompat_bypass"):
    <!-- Sentry disabled due to user agent incompatibility: ${bypass} -->
%else:
    <%
        comp = request.env.sentry
        route = request.matched_route
        init_opts = dict(
            dsn=comp.dsn_js,
            environment=comp.environment,
            routeName=route.name if route else None,
        )
    %>
    <script type="text/javascript">
        ngwEntry(${json_js(INIT_JSENTRY)}).then(({ init }) => {
            init(${json_js(init_opts)});
        });
    </script>
%endif