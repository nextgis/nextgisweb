<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.auth.util import _ %>

<%def name="head()">
    <script>
        require([
            "dojo/ready",
            "ngw/sorted-table"
        ], function(
            ready,
            sortedTable
        ){
            ready(function() {
                sortedTable(document.getElementById("group-table"));
            });
        });
    </script>
</%def>

<div class="content-box">
    <div class="table-wrapper">
        <table id="group-table" class="pure-table pure-table-horizontal">
            <thead>
                <tr>
                    <th class="sort-default" style="width: 50%; text-align: inherit;">${tr(_("Full name"))}</th>
                    <th style="width: 50%; text-align: inherit;">${tr(_("Group name"))}</th>
                    <th class="no-sort" style="width: 0px;">&nbsp;</th>
                </tr>
            </thead>
            <tbody>
                %for obj in obj_list:
                    <tr>
                        <td>${obj.display_name}</td>
                        <td>${obj.keyname}</td>
                        <td>
                            <a class="material-icons icon-edit" href="${request.route_url('auth.group.edit', id=obj.id)}"></a>
                        </td>
                    </tr>
                %endfor
            </tbody>
        </table>
    </div>
</div>
