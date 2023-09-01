<%!
    from nextgisweb.resmeta.model import VTYPE_DISPLAY_NAME
    from nextgisweb.resource import ResourceScope
%>

<%page args="section" />
<% section.content_box = False %>

<table class="pure-table pure-table-horizontal ngw-card" style="width: 100%">
    <thead>
        <tr>
            <th style="width: 20%; text-align: inherit;">${tr(_("Key"))}</th>
            <th style="width: 20%; text-align: inherit;">${tr(_("Type"))}</th>
            <th style="width: 60%; text-align: inherit; white-space: nowrap;">${tr(_("Value"))}</th>
        </tr>
    </thead>
    <%def name="value_cell_content(mi)"><%
        if mi.vtype == 'null':
            return Markup('&nbsp;')
        elif mi.vtype == 'boolean':
            return tr(_("True")) if mi.value else tr(_("False"))
        else:
            return mi.value
    %></%def>
    %if ResourceScope.read in obj.permissions(request.user):
        %for mi in obj.resmeta:
            <tr>
                <td>${mi.key}</td>
                <td>${tr(VTYPE_DISPLAY_NAME[mi.vtype])}</td>
                <td>${value_cell_content(mi)}</td>
            </tr>
        %endfor
    %endif
</table>
