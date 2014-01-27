<table class="data" style="width: 100%">
    <thead>
        <tr>
            <th>#</th>
            <th>Наименование</th>
            <th>Владелец</th>
            <th>Операции</th>
        </tr>
    </thead>
    %for idx, group in enumerate(obj.children, start=1):
        <tr>
            <td>${idx}</td>
            <td><a href="${group.permalink(request)}">${group.display_name}</a></td>
            <td>${group.owner_user}</td>
            <td>
                <a href="${request.route_url('layer_group.edit', id=group.id)}">редактировать</a>
            </td>
        </tr>
    %endfor
    %if len(obj.children) == 0:
        <tr>
            <td colspan="4">
                <i>В этой группе пока нет подгрупп</i>
            </td>
        </tr>
    %endif
</table>