<%inherit file='nextgisweb:templates/base.mako' />

<table class="pure-table pure-table-horizontal" style="width: 100%;">
    <thead>
        <tr>
            <th style="width: 2em;">ID</th>
            <th style="width: 50%;">Наименование</th>
            <th style="width: 50%">Имя пользователя</th>
            <th style="width: 0px;">&nbsp;</th>
        </tr>
    </thead>
    <tbody>
        %for obj in obj_list:
            <tr>
                <td>${obj.id}</td>
                <td>${obj.display_name}</td>
                <td>${obj.keyname}</td>
                <td>
                    <a class="dijitIconEdit" style="width: 16px; height: 16px; display: inline-block;" href="${request.route_url('auth.group.edit', id=obj.id)}"></a>
                </td>
            </tr>
        %endfor
    </tbody>
</table>