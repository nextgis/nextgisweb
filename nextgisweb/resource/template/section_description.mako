<%! from nextgisweb.resource.util import _ %>
<%namespace file="nextgisweb:templates/clean.mako" import="clean_html"/>
%if obj.description is None:
    <p class="empty"><i>${tr(_("Resource description is empty."))}</i></p>
%else:
    ${ obj.description | clean_html, n }
%endif