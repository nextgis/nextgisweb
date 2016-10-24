<%! from nextgisweb.resource.util import _ %>
<script>
    require([
        "dojo/ready",
        "ngw/sorted-table",
        "svg4everybody/svg4everybody"
    ], function(
        ready,
        sortedTable,
        svg4everybody
    ){
        ready(function() {
            sortedTable(document.getElementById("children-table"));
            svg4everybody();
        });
    });
</script>
<div class="table-wrapper">
    <table id="children-table" class="children-table pure-table pure-table-horizontal">
        <thead>
            <tr>
                <th class='sort-default' style="width: 50%; text-align: inherit;">${tr(_("Display name"))}</th>
                <th style="width: 25%; text-align: inherit;">${tr(_("Type"))}</th>
                <th style="width: 20%; text-align: inherit;">${tr(_("Owner"))}</th>
                <th class="no-sort" style="width: 0%">&nbsp;</th>
            </tr>
        </thead>
        <% groups = [child for child in obj.children if child.cls == "resource_group"] %>
        <% other = [child for child in obj.children if child.cls != "resource_group"] %>
        % if len(groups):
        <tbody>
            %for child in groups:
                <tr>
                    <td class="children-table__name">
                        <a class="children-table__name__link text-withIcon" href="${child.permalink(request)}">
                            <span class="text-withIcon__icon">
                                <svg class="text-withIcon__pic text-withIcon__pic_type_${child.cls}"> <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${request.static_url('nextgisweb:static/svg/svg-symbols.svg')}#${child.cls}"></use></svg>
                            </span>
                            ${child.display_name}
                        </a>
                    </td>
                    <td>${tr(child.cls_display_name)}</td>
                    <td>${child.owner_user}</td>
                    <td class="children-table__action">
                        %if child.cls == "webmap":
                        <a class="material-icons icon-viewMap" href="${request.route_url('webmap.display', id=child.id)}" target="_blank" title="${tr(_('Display map'))}"></a>
                        %endif
                        %if child.cls == "vector_layer" or child.cls == "postgis_layer":
                        <a class="material-icons icon-table" href="${request.route_url('feature_layer.feature.browse', id=child.id)}" title="${tr(_('Feature table'))}"></a>
                        %endif
                        <a class="material-icons icon-edit" href="${request.route_url('resource.update', id=child.id)}" title="${tr(_('Update'))}"></a>
                        <a class="material-icons icon-close" href="${request.route_url('resource.delete', id=child.id)}" title="${tr(_('Delete'))}"></a>
                    </td>
                </tr>
            %endfor
        </tbody>
        % endif
        % if len(other):
        <tbody>
            %for child in other:
                <tr>
                    <td class="children-table__name">
                        <a class="children-table__name__link text-withIcon" href="${child.permalink(request)}">
                            <span class="text-withIcon__icon">
                                <svg class="text-withIcon__pic text-withIcon__pic_type_${child.cls}"> <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${request.static_url('nextgisweb:static/svg/svg-symbols.svg')}#${child.cls}"></use></svg>
                            </span>
                            ${child.display_name}
                        </a>
                    </td>
                    <td>${tr(child.cls_display_name)}</td>
                    <td>${child.owner_user}</td>
                    <td class="children-table__action">
                        %if child.cls == "webmap":
                        <a class="material-icons icon-viewMap" href="${request.route_url('webmap.display', id=child.id)}" target="_blank" title="${tr(_('Display map'))}"></a>
                        %endif
                        %if child.cls == "vector_layer" or child.cls == "postgis_layer":
                        <a class="material-icons icon-table" href="${request.route_url('feature_layer.feature.browse', id=child.id)}" title="${tr(_('Feature table'))}"></a>
                        %endif
                        <a class="material-icons icon-edit" href="${request.route_url('resource.update', id=child.id)}" title="${tr(_('Update'))}"></a>
                        <a class="material-icons icon-close" href="${request.route_url('resource.delete', id=child.id)}" title="${tr(_('Delete'))}"></a>
                    </td>
                </tr>
            %endfor
        </tbody>
        % endif
    </table>
</div>
