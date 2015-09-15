<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.auth.util import _ %>

<table class="pure-table pure-table-horizontal" style="width: 100%;">
    <thead>
        <tr>
            <th style="width: 2em;">ID</th>
            <th style="width: 50%;">${tr(_("Full name"))}</th>
            <th style="width: 50%;">${tr(_("Login"))}</th>
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
                    <a class="dijitIconEdit" style="width: 16px; height: 16px; display: inline-block;" href="${request.route_url('auth.user.edit', id=obj.id)}"></a>
                </td>
            </tr>
        %endfor
    </tbody>
</table>
