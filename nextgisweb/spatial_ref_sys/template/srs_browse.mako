<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.spatial_ref_sys.util import _ %>

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
                sortedTable(document.getElementById("srs-table"));
            });
        });
    </script>
</%def>

<div class="content-box">
    <div class="table-wrapper">
        <table id="srs-table" class="pure-table pure-table-horizontal">
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
                        <td>${obj.auth_srid}</td>
                        <td>
                            <a class="material-icons icon-edit" href="${request.route_url('srs.list.edit', id=obj.id)}"></a>
                        </td>
                    </tr>
                %endfor
            </tbody>
        </table>
    </div>
</div>
