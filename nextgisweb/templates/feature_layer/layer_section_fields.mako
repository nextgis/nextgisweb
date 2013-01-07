<%page args="layer" />

<table>
    <thead><tr>
        <th>#</th>
        <th>Ключ</th>
        <th>Тип</th>
        <th>Наименование</th>
    </tr></thead>
    %for field in layer.fields:
        <tr>
            <td>${field.idx + 1}</td>
            <td>${field.keyname}</td>
            <td>${field.datatype}</td>
            <td>${field.display_name}</td>
        </tr>
    %endfor

</table>
