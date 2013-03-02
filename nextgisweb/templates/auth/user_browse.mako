<%inherit file='../base.mako' />

<table class="data" style="width: 100%;">
    <thead>
        <tr>
            <th>#</th>
            <th>Наименование</th>
            <th>Имя пользователя</th>
            <th>Операции</th>
        </tr>
    </thead>
    <tbody>
        %for obj in obj_list:
            <tr>
                <td>${obj.id}</td>
                <td>${obj.display_name}</td>
                <td>${obj.keyname}</td>
                <td>
                    <a href="${request.route_url('auth.user.edit', id=obj.id)}">редактировать</a>
                </td>
            </tr>
        %endfor
    </tbody>
</table>