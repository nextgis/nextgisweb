<%! from nextgisweb.resource.util import _ %>
<table class="pure-table pure-table-horizontal" style="width: 100%">
    <thead>
        <tr>
            <th style="width: 5%">#</th>
            <th style="width: 50%">${tr(_("Display name"))}</th>
            <th style="width: 25%">${tr(_("Type"))}</th>
            <th style="width: 20%">${tr(_("Owner"))}</th>
            <th style="width: 0%">&nbsp;</th>
        </tr>
    </thead>
    %for idx, child in enumerate(obj.children, start=1):
        <tr>
            <td>${idx}</td>
            <td><a style="display: block" href="${child.permalink(request)}">${child.display_name}</a></td>
            <td>${tr(child.cls_display_name)}</td>
            <td>${child.owner_user}</td>
            <td style="white-space: nowrap">
                <a class="dijitIconEdit" style="width: 16px; height: 16px; display: inline-block;" href="${request.route_url('resource.update', id=child.id)}"></a>
                <a class="dijitIconDelete" style="width: 16px; height: 16px; display: inline-block;" href="${request.route_url('resource.delete', id=child.id)}"></a>

            </td>
        </tr>
    %endfor
</table>