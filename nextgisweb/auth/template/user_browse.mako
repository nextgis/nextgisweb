<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.auth.util import _ %>

<script type="text/javascript">
    require([
        "@nextgisweb/pyramid/tablesort",
        "@nextgisweb/auth/browse",
        "dojo/domReady!"
    ], function (tablesort) {
        tablesort.byId("user-table");
    })
</script>

<div class="content-box">
    <div class="table-wrapper">
        <table id="user-table" class="pure-table pure-table-horizontal">
            <thead>
                <tr>
                    <th class="sort-default" style="width: 50%; text-align: inherit;">${tr(_("Full name"))}</th>
                    <th style="width: 50%; text-align: inherit;">${tr(_("Login"))}</th>
                    <th class="no-sort" style="width: 0px;">&nbsp;</th>
                </tr>
            </thead>
            <tbody>
                %for obj in obj_list:
                    <tr class="${'text-muted' if obj.disabled else ''}">
                        <td>${obj.display_name}</td>
                        <td>${obj.keyname}</td>
                        <td class="fit-content">
                            <a class="material-icons icon-edit" href="${request.route_url('auth.user.edit', id=obj.id)}" title="${tr(_('Edit'))}"></a>
                            <a class="material-icons icon-close" onclick="principal_delete('U', ${obj.id})" title="${tr(_('Delete'))}"></a>
                        </td>
                    </tr>
                %endfor
            </tbody>
        </table>
    </div>
</div>
