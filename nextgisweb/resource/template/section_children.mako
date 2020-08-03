<%!
from bunch import Bunch
from nextgisweb import dynmenu as dm
from nextgisweb.resource.util import _
from nextgisweb.resource.scope import ResourceScope, DataScope
from nextgisweb.webmap.model import WebMapScope
%>

<%namespace file="nextgisweb:pyramid/template/util.mako" import="icon"/>

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
                        ${icon('svg:' + item.cls)}
                        ${item.display_name}
                    </a>
                </td>
                <td>${tr(item.cls_display_name)}</td>
                <td>${item.owner_user}</td>
                <td class="children-table__action">
                    <% args = Bunch(obj=item, request=request) %>
                    %for menu_item in item.__dynmenu__.build(args):
                        %if isinstance(menu_item, dm.Link) and menu_item.important and menu_item.icon is not None:
                            <a href="${menu_item.url(args)}" target="_blank" title="${tr(_(menu_item.label))}">${icon(menu_item.icon)}</a>
                        %endif
                    %endfor
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
