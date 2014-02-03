<%inherit file='../base.mako' />

<table class="data" style="width: 100%;">
    <thead>
        <tr>
            <th>#</th>
            <th>Наименование</th>
            <th>Владелец</th>
            <th>Операции</th>
        </tr>
    </thead>
    <tbody>
        %for idx, obj in enumerate(obj_list, start=1):
            <tr>
                <td>${idx}</td>
                <td>
                    <a href="${request.route_url('webmap.show', id=obj.id)}">${obj.display_name}</a>
                </td>
                <td>${obj.owner_user}</td>
                <td>
                    <a href="${request.route_url('webmap.display', id=obj.id)}">открыть</a>
                    <a href="${request.route_url('webmap.edit', id=obj.id)}">редактировать</a>
                </td>
            </tr>
        %endfor
    </tbody>
</table>