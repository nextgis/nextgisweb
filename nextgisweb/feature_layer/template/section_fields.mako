<%! from nextgisweb.feature_layer.util import _ %>
<table class="pure-table pure-table-horizontal" style="width: 100%">
    <thead><tr>
        <th>${tr(_("Keyname"))}</th>
        <th>${tr(_("Type"))}</th>
        <th>${tr(_("Display name"))}</th>
        <th style="width: 0; text-align: center;">${tr(_("Table"))}</th>
    </tr></thead>
    %for field in obj.fields:
        <tr style="${'text-decoration: underline;' if field.id == obj.feature_label_field_id else '' | n}">
            <td>${field.keyname}</td>
            <td>${field.datatype}</td>
            <td>${field.display_name}</td>
            <td style="text-align: center;">${tr(_("Yes")) if field.grid_visibility else tr(_("No")) | n}</td>
        </tr>
    %endfor
</table>
