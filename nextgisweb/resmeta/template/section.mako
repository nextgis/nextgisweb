<%
    from nextgisweb.resmeta.util import _
    from nextgisweb.resource import MetadataScope
%>
<div class="table-wrapper">
    <table class="pure-table pure-table-horizontal">
        <thead>
            <tr>
                <th style="width: 20%; text-align: inherit;">${tr(_("Key"))}</th>
                <th style="width: 20%; text-align: inherit;">${tr(_("Type"))}</th>
                <th style="width: 60%; text-align: inherit; white-space: nowrap;">${tr(_("Value"))}</th>
            </tr>
        </thead>
        %if MetadataScope.read in obj.permissions(request.user):
            %for mi in obj.resmeta:
                <tr>
                    <td>${mi.key}</td>
                    <td>${mi.vtype}</td>
                    <td>${mi.value}</td>
                </tr>
            %endfor
        %endif
    </table>
</div>
