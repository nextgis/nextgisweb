<%!
    import math
    import json
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
            <tr data-id="${item.id}">
                <td class="children-table__name">
                    <a class="children-table__name__link text-withIcon" href="${item.permalink(request)}">
                        ${icon('svg:' + item.cls)}
                        ${item.display_name}
                    </a>
                </td>
                <td>${tr(item.cls_display_name)}</td>
                <td>${item.owner_user}</td>
                <td class="column-volume" style="display: none; text-align: right"></td>
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
        "@nextgisweb/pyramid/api",
        "dojo/query",
        "dojo/dom",
        "dojo/dom-style",
        "dijit/Menu",
        "dijit/MenuItem",
        "dojo/domReady!"
    ], function (
        tablesort,
        api,
        query, 
        dom,
        domStyle,
        Menu,
        MenuItem
    ) {
        tablesort.byId("children-table");

        function formatSize(volume) {
            if (volume === 0) {
                return "-";
            } else {
                var units = ["B", "KB", "MB", "GB", "TB"];
                var i = Math.min(Math.floor(Math.log(volume) / Math.log(1024)), units.length - 1);
                value = volume / Math.pow(1024, i);
                return value.toFixed(2) + " " + units[i];
            }
        }

        function showVolume() {
            var tableNode = dom.byId('children-table');
            var cells = query('.column-volume', tableNode);
            var tasks = [];

            cells.forEach(function (node) {
                domStyle.set(node, 'display', '');
                var id = node.parentElement.getAttribute('data-id');
                if (id !== null) {
                    node.innerHTML = '...';
                    tasks.push({id: id, node: node});
                }
            });

            function next() {
                var task = tasks.shift();
                if (task === undefined) {
                    return;
                };
                api.route('resource.volume', task.id).get().then(
                    function (data) {
                        task.node.innerHTML = formatSize(data.volume);
                        task.node.setAttribute('data-sort', data.volume);
                        next();
                    }
                )
            };

            next();
        }

        var menu = new Menu({
            targetNodeIds: ['resourceChildrenOptions'],
            leftClickToOpen: true,
        });

        %if request.env.core.options['storage.enabled']:
        
        menu.addChild(new MenuItem({
            label: ${tr(_("Show resources volume")) | json.dumps, n },
            onClick: showVolume,
        }));
        
        %endif

        menu.startup();
    });
</script>

<div class="table-wrapper">
    <table id="children-table" class="children-table pure-table pure-table-horizontal">
        <thead>
            <tr>
                <th class='sort-default' style="text-align: inherit;">${tr(_("Display name"))}</th>
                <th style="text-align: inherit;">${tr(_("Type"))}</th>
                <th style="text-align: inherit;">${tr(_("Owner"))}</th>
                <th class="column-volume" data-sort-method='number' style="text-align: right; display: none;">${tr(_("Volume"))}</th>
                <th class="no-sort" style="text-align: right;">
                    <i id="resourceChildrenOptions" class="material-icons icon-moreVert" style="cursor: pointer;"></i>
                </th>
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
