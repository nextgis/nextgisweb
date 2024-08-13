<%! from nextgisweb.resource import ResourceScope %>

<%page args="section" />
<% section.content_box = False %>

<%
    have_lookup_table = False
    for field in obj.fields:
        if field.lookup_table is not None:
            have_lookup_table = True
%>

<table class="pure-table pure-table-horizontal ngw-card" style="width: 100%">
    <thead><tr>
        <th style="text-align: inherit; width: 20%; ">${tr(gettext("Keyname"))}</th>
        <th style="text-align: inherit; width: 20%;">${tr(gettext("Type"))}</th>
        <th style="text-align: inherit; width: 40%;">${tr(gettext("Display name"))}</th>
        %if have_lookup_table:
            <th style="text-align: center; width: 10%;">${tr(gettext("Lookup table"))}</th>
        %endif
        <th style="text-align: center; width: 20%;">${tr(gettext("Table"))}</th>
    </tr></thead>
    %if ResourceScope.read in obj.permissions(request.user):
        %for field in obj.fields:
            <tr style="${'text-decoration: underline;' if field.id == obj.feature_label_field_id else '' | n}">
                <td>${field.keyname}</td>
                <td>${field.datatype}</td>
                <td>${field.display_name}</td>
                %if have_lookup_table:
                    <td style="text-align: center;">
                    %if field.lookup_table is not None:
                        <a href="${request.route_url('resource.show', id=field.lookup_table.id)}">${tr(gettext("Yes"))}</a>
                    %else:
                        ${tr(gettext("No"))}
                    %endif
                    </td>
                %endif
                <td style="text-align: center;">${tr(gettext("Yes")) if field.grid_visibility else tr(gettext("No")) | n}</td>
            </tr>
        %endfor
    %endif
</table>
