<table style="width: 100%">
    <thead>
        <tr>
            <th>Наименование</th>
            <th>Тип</th>
            <th>Операции</th>
        </tr>
    </thead>
    %for layer in obj.layers:
        <tr>
            <td><a href="${layer.permalink(request)}">${layer.display_name}</a></td>
            <td>${request.env.layer.Layer.registry[layer.cls].cls_display_name}</td>
            <td>
                <a href="${request.route_url('layer.edit', id=layer.id)}">редактировать</a>
            </td>
        </tr>
    %endfor
    %if len(obj.layers) == 0:
        <tr>
            <td colspan="3">
                <i>В этой группе пока нет слоёв.</i>
            </td>
        </tr>
    %endif
</table>
