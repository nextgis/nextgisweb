<%inherit file="nextgisweb:pyramid/template/base.mako" />
<%! from nextgisweb.auth.util import _ %>

<% oauth = request.env.auth.oauth%>
%if oauth is not None and oauth.options['enabled'] and oauth.options['bind']:
    <h2>NextGIS ID</h2>
    <p>
    %if request.user.oauth_subject is None:
        <%
            query = dict(merge=1, next=request.current_route_url())
            oauth_url = request.route_url('auth.oauth', _query=query)
        %>
        <a href="${oauth_url}">${tr(_("Sign in with OAuth"))}</a>
    %else:
        ${tr(_("Your account is bound to NextGIS ID account"))}
    %endif
    </p>
%endif

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        require([
            "ngw-auth/SettingsForm",
            "dojo/domReady!"
        ], function (
            SettingsForm
        ) {
            (new SettingsForm()).placeAt('form').startup();
        });
    </script>
</%def>

<div id="form" style="width: 100%;"></div>
