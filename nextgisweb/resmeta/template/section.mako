<% from nextgisweb.resmeta.util import _ %>
<table class="pure-table pure-table-horizontal" style="width: 100%">
    <thead>
        <tr>
            <th style="width: 30%;">${tr(_("Key"))}</th>
            <th style="width: 20%;">${tr(_("Type"))}</th>
            <th style="width: 50%; white-space: nowrap;">${tr(_("Value"))}</th>
        </tr>
    </thead>
    %for mi in obj.resmeta:
        <tr>
            <td>${mi.key}</td>
            <td>${mi.vtype}</td>
            <td>${mi.value}</td>
        </tr>
    %endfor
</table>