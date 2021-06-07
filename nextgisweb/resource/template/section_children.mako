<%!
import math
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
        "svg4everybody/svg4everybody"
    ], function(
        ready,
        svg4everybody
    ){
        ready(function() {
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
            <tr data-resource-id="${item.id}">
                <td class="children-table__name">
                    <a class="children-table__name__link text-withIcon" href="${item.permalink(request)}">
                        ${icon('svg:' + item.cls)}
                        ${item.display_name}
                    </a>
                </td>
                <td>${tr(item.cls_display_name)}</td>
                <td class="resource-volume" style="display: none;"></td>
                <td>${item.owner_user}</td>
                <td class="children-table__action">
                    <% args = Bunch(obj=item, request=request) %>
                    %for menu_item in item.__dynmenu__.build(args):
                        %if isinstance(menu_item, dm.Link) and menu_item.important and menu_item.icon is not None:
                            <a href="${menu_item.url(args)}" target="${menu_item.target}" title="${tr(menu_item.label)}">${icon(menu_item.icon)}</a>
                        %endif
                    %endfor
                </td>
            </tr>
        %endfor    
    </tbody>
</%def>

<script type="text/javascript">
    require([
        "@nextgisweb/pyramid/tablesort",
        "ngw/route",
        "dojo/promise/all",
        "dojo/request/xhr",
        "dojo/domReady!"
    ], function (
        tablesort,
        route,
        all,
        xhr,
    ) {
        tablesort.byId("children-table");

        var children_table = document.getElementById("children-table");
        var volume_cell_head = document.getElementById("resource-volume-head");
        var rows = children_table
            .getElementsByTagName("tbody")[0]
            .getElementsByTagName("tr");
        var volume_cells = [];
        rows.forEach(function (element) {
            var resource_id_str = element.getAttribute("data-resource-id");
            var volume_cell = element.getElementsByClassName("resource-volume")[0];
            volume_cells[resource_id_str] = volume_cell;
        });
        var show_volume_chk = document.getElementById("show-volume-chk");

        var volumes_loaded = false;
        var in_progress = false;

        function toggle_resource_volume (show) {

            function _toggle_resource_volume_display (show) {
                var display = show ? "" : "none";
                volume_cell_head.style.display = display;
                Object.keys(volume_cells).forEach(function (resource_id_str) {
                    var volume_cell = volume_cells[resource_id_str];
                    volume_cell.style.display = display;
                });
                in_progress = false;
            }

            if (show && !volumes_loaded) {

                function volume_pretty(volume) {
                    if (volume === 0) {
                        return "-";
                    } else {
                        var units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
                        var i = Math.min(Math.floor(Math.log(volume) / Math.log(1024)), units.length - 1)
                        value = volume / 1024**i;
                        return value.toFixed(2) + " " + units[i];
                    }
                }

                var wait_requests = 0;
                for (var resource_id_str in volume_cells) {
                    var volume_cell = volume_cells[resource_id_str];

                    wait_requests++;
                    xhr.get(route.resource.volume({
                        id: resource_id_str
                    }), {
                        handleAs: "json"
                    }).then(function (data) {
                        this.innerHTML = volume_pretty(data.volume);
                    }.bind(volume_cell))
                    .finally(function () {
                        if (--wait_requests === 0) {
                            volumes_loaded = true;
                            _toggle_resource_volume_display(show)
                        }
                    });
                }
            } else {
                _toggle_resource_volume_display(show);
            }
        }

        show_volume_chk.onclick = function (event) {
            if (in_progress) {
                event.preventDefault();
                return;
            }

            in_progress = true;
            var show = show_volume_chk.checked;
            toggle_resource_volume(show);
        };
    });
</script>

<input id="show-volume-chk" type="checkbox">${tr(_("Show volume"))}</input>
<div class="table-wrapper">
    <table id="children-table" class="children-table pure-table pure-table-horizontal">
        <thead>
            <tr>
                <th class='sort-default' style="width: 40%; text-align: inherit;">${tr(_("Display name"))}</th>
                <th style="width: 25%; text-align: inherit;">${tr(_("Type"))}</th>
                <th style="width: 10%; text-align: inherit; display: none;" id="resource-volume-head">${tr(_("Volume"))}</th>
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
