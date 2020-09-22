<%! from nextgisweb.icon_library.util import _ %>
<table class="pure-table pure-table-horizontal" style="width: 100%">
    <thead>
        <tr>
            <th style="width: 5%">#</th>
            <th style="width: 75%">${tr(_("Name"))}</th>
        </tr>
    </thead>
    %for idx, fobj in enumerate(obj.files, start=1):
        <tr>
            <td>${idx}</td>
            <td>
                <a href="${request.route_url('resource.file_download', id=obj.id, name=fobj.name)}">
                ${fobj.name}
                </a>
            </td>
        </tr>
    %endfor
</table>
