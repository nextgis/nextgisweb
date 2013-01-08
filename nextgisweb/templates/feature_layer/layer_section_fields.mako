<table style="width: 100%">
    <thead><tr>
        <th>#</th>
        <th>Ключ</th>
        <th>Тип</th>
        <th>Наименование</th>
    </tr></thead>
    %for field in obj.fields:
        <tr>
            <td>${field.idx + 1}</td>
            <td>${field.keyname}</td>
            <td>${field.datatype}</td>
            <td>${field.display_name}</td>
        </tr>
    %endfor
</table>

<a href="${request.route_url('feature_layer.feature.browse', id=obj.id)}">
    Открыть таблицу объектов
</a>
