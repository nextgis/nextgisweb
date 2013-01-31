<table class="data" style="width: 100%">
    <thead>
        <tr>
            <th>Наименование</th>
            <th>Тип</th>
            <th>Операции</th>
        </tr>
    </thead>
    %for style in obj.styles:
        <tr>
            <td><a href="${style.permalink(request)}">${style.display_name}</a></td>
            <td>${request.env.style.Style.registry[style.cls].cls_display_name}</td>
            <td>
                <a href="${request.route_url('style.edit', id=style.id, layer_id=style.layer_id)}">редактировать</a>
            </td>
        </tr>
    %endfor
    %if len(obj.styles) == 0:
        <tr>
            <td colspan="3">
                <i>У этого слоя пока нет ни одного стиля.</i>
            </td>
        </tr>
    %endif
</table>
