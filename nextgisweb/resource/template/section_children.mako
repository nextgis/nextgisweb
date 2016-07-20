<%! from nextgisweb.resource.util import _ %>
<table class="children-table pure-table pure-table-horizontal">
    <thead>
        <tr>
            <th style="width: 5%; text-align: inherit;">#</th>
            <th style="width: 50%; text-align: inherit;">${tr(_("Display name"))}</th>
            <th style="width: 25%; text-align: inherit;">${tr(_("Type"))}</th>
            <th style="width: 20%; text-align: inherit;">${tr(_("Owner"))}</th>
            <th style="width: 0%">&nbsp;</th>
        </tr>
    </thead>

    <tbody>
    %for idx, child in enumerate(obj.children, start=1):
        <tr>
            <td>${idx}</td>
            <td class="children-table__name"><a class="children-table__name__link" href="${child.permalink(request)}">${child.display_name}</a></td>
            <td>${tr(child.cls_display_name)}</td>
            <td>${child.owner_user}</td>
            <td class="children-table__action">
                %if child.cls == "webmap":
                <a class="material-icons icon-viewMap" href="${request.route_url('webmap.display', id=child.id)}" target="_blank" title="${tr(_('Display map'))}"></a>
                %endif
                %if child.cls == "vector_layer":
                <a class="material-icons icon-table" href="${request.route_url('feature_layer.feature.browse', id=child.id)}" title="${tr(_('Feature table'))}"></a>
                %endif
                <a class="material-icons icon-edit" href="${request.route_url('resource.update', id=child.id)}" title="${tr(_('Update'))}"></a>
                <a class="material-icons icon-close" href="${request.route_url('resource.delete', id=child.id)}" title="${tr(_('Delete'))}"></a>
            </td>
        </tr>
    %endfor
    </tbody>
</table>