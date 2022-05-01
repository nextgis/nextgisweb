<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>
<%! from platform import platform %>
<%! import sys %>


<div class="content-box">
    <div class="table-wrapper">
        <table id="package-table" class="pure-table pure-table-horizontal">          
            <thead>
                <tr>
                    <th>${_("Filename")}</th>
                    <th>${_("Timestamp (UTC)")}</th>
                    <th>${_("Size")}</th>
            <tbody>

            %for item in items:
            <tr>
                <td>
                    <a href="${request.route_url('pyramid.control_panel.backup.download', filename=item.filename)}">${item.filename}</a>
                </td>
                <td>${item.timestamp}</td>
                <td>${item.size / 1024}&nbsp;KB</td>
            </tr>
            %endfor

            </tbody>
        </table>
    </div>
</div>
