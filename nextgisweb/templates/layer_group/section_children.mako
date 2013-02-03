<table class="data" style="width: 100%">
    <thead>
        <tr>
            <th>Наименование</th>
            <th>Владелец</th>
            <th>Операции</th>
        </tr>
    </thead>
    %for group in obj.children:
        <tr>
            <td><a href="${group.permalink(request)}">${group.display_name}</a></td>
            <td>${group.owner_user}</td>
            <td>
                <a href="${request.route_url('layer_group.edit', id=group.id)}">редактировать</a>
            </td>
        </tr>
    %endfor
    %if len(obj.children) == 0:
        <tr>
            <td colspan="3">
                <i>В этой группе пока нет подгрупп</i>
            </td>
        </tr>
    %endif
</table>