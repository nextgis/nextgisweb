<table class="data" style="width: 100%">
    <thead>
        <tr>
            <th>#</th>
            <th>Наименование</th>
            <th>Тип</th>
            <th>Владелец</th>
            <th>Операции</th>
        </tr>
    </thead>

    <% from nextgisweb.layer import Layer %>
    
    %for idx, layer in enumerate(obj.layers, start=1):
        <tr>
            <td>${idx}</td>
            <td><a href="${layer.permalink(request)}">${layer.display_name}</a></td>
            <td>${Layer.registry[layer.cls].cls_display_name}</td>
            <td>${layer.owner_user}</td>
            <td>
                <a href="${request.route_url('layer.edit', id=layer.id)}">редактировать</a>
            </td>
        </tr>
    %endfor
    %if len(obj.layers) == 0:
        <tr>
            <td colspan="5">
                <i>В этой группе пока нет слоёв.</i>
            </td>
        </tr>
    %endif
</table>
