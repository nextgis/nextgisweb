<%!
from nextgisweb.resource.util import _
from nextgisweb.resource.scope import ResourceScope, DataScope
from nextgisweb.webmap.model import WebMapScope
%>
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

<%def name="child_group(children)">
    <tbody>
        %for item in children:
            <% permissions = item.permissions(request.user) %>
            %if ResourceScope.read not in permissions:
                <% continue %>
            %endif
            <tr>
                <td class="children-table__name">
                    <a class="children-table__name__link text-withIcon" href="${item.permalink(request)}">
                        <span class="text-withIcon__icon">
                            <svg class="text-withIcon__pic svgIcon-${item.cls}"> <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${request.static_url('nextgisweb:static/svg/svg-symbols.svg')}#${item.cls}"></use></svg>
                        </span>
                        ${item.display_name}
                    </a>
                </td>
                <td>${tr(item.cls_display_name)}</td>
                <td>${item.owner_user}</td>
                <td class="children-table__action">
                    %if item.cls == "webmap" and WebMapScope.display in permissions:
                        <a class="material-icons icon-viewMap" href="${request.route_url('webmap.display', id=item.id)}" target="_blank" title="${tr(_('Display map'))}"></a>
                    %endif
                    %if (item.cls == "vector_layer" or item.cls == "postgis_layer") and DataScope.read in permissions:
                        <a class="material-icons icon-table" href="${request.route_url('feature_layer.feature.browse', id=item.id)}" title="${tr(_('Feature table'))}"></a>
                    %endif
                    %if ResourceScope.update in permissions:
                        <a class="material-icons icon-edit" href="${request.route_url('resource.update', id=item.id)}" title="${tr(_('Update'))}"></a>
                    %endif
                    %if ResourceScope.delete in permissions:
                        <a class="material-icons icon-close" href="${request.route_url('resource.delete', id=item.id)}" title="${tr(_('Delete'))}"></a>
                    %endif
                </td>
            </tr>
        %endfor    
    </tbody>
</%def>

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
        <% 
        groups = [child for child in obj.children if child.cls == "resource_group"]
        other = [child for child in obj.children if child.cls != "resource_group"]

        if len(groups):
            child_group(groups)

        if len(other):
            child_group(other)
        %>
    </table>
</div>
