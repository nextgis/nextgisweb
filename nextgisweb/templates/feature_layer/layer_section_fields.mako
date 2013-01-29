<table style="width: 100%">
    <thead><tr>
        <th>Ключ</th>
        <th>Тип</th>
        <th>Наименование</th>
        <th style="width: 0; text-align: center;">Таб.</th>
    </tr></thead>
    %for field in obj.fields:
        <tr style="${'text-decoration: underline;' if field.id == obj.feature_label_field_id else '' | n}">
            <td>${field.keyname}</td>
            <td>${field.datatype}</td>
            <td>${field.display_name}</td>
            <td style="text-align: center;">${'&#9899;' if field.grid_visibility else '&#9898;' | n}</td>
        </tr>
    %endfor
</table>