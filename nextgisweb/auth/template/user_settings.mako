<%inherit file="nextgisweb:pyramid/template/base.mako" />
<%! from nextgisweb.auth.util import _ %>

<h2>${tr(_("NextGIS ID"))}</h2>
<p>
%if request.user.oauth_subject is None:
    <%
        query = dict(merge=1, next=request.current_route_url())
        oauth_url = request.route_url('auth.oauth', _query=query)
    %>
    <a href="${oauth_url}">${tr(_("Sign with NextGIS ID account"))}</a>
%else:
    ${tr(_("You are linked to NextGIS ID account"))}
%endif
</p>
