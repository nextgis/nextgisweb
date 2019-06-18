<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.spatial_ref_sys.util import _ %>

<%def name="head()">
    <script>
        require([
            "dojo/ready",
            "ngw/sorted-table",
            "dojo/request/xhr"
        ], function(
            ready,
            sortedTable,
            xhr
        ){
            ready(function() {
                var widget = this;
                sortedTable(document.getElementById("srs-table"));
                var deleteBtn = document.getElementsByClassName("icon-delete")[0];
                deleteBtn.onclick = (function(e) {
                    e.preventDefault();
                    var isForDelete = confirm('${tr(_("Confirm remove of SRS"))}');
                    if (isForDelete) {
                        xhr.del(e.target.href, {
                                    handleAs: "json",
                                    headers: { "Content-Type": "application/json" }
                                }).then(
                                    function (response) {
                                        if (response.status_code == 200) {
                                            window.location = response.redirect;
                                        } else if (response.status_code == 400) {
                                            widget.set("error", response.error);
                                        } else {
                                            // something wrong with the response
                                        }
                                    },
                                );
                    }
                });
                
            });
        });
    </script>
</%def>

<div class="content-box">
    <div class="table-wrapper">
        <table id="srs-table" class="pure-table pure-table-horizontal">
            <thead>
                <tr>
                    <th class="sort-default" style="width: 50%; text-align: inherit;">${tr(_("SRS name"))}</th>
                    <th class="no-sort" style="width: 0px;">&nbsp;</th>
                </tr>
            </thead>
            <tbody>
                %for obj in obj_list:
                    <tr class="${'text-muted' if obj.disabled else ''}">
                        <td>${obj.display_name}</td>
                        
                        <td>
                            %if not obj.disabled:
                                <a class="material-icons icon-edit" href="${request.route_url('srs.edit', id=obj.id)}"></a>
                                <a class="material-icons icon-delete" href="${request.route_url('srs.browse', id=obj.id)}"></a>
                            %endif
                        </td>
                    </tr>
                %endfor
            </tbody>
        </table>
    </div>
</div>
