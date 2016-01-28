<% permsets = obj.permission_sets(request.user) %>
<table class="pure-table pure-table-horizontal" style="width: 100%">
    %for k, scope in obj.scope.iteritems():
        <thead><tr>
            <th style="width: 70%; text-align: inherit;">${tr(scope.label)}</th>
            <th style="width: 30%; text-align: inherit;"><tt>${k}</tt></th>
            <th style="width: 0%">&nbsp;</th>
        </tr></thead>
        <tbody>
        %for perm in scope.itervalues(ordered=True):
        <tr>
            <td>${tr(perm.label)}</td>
            <td><tt>${perm.name}</tt></td>
            <td>
                <%
                if (perm in permsets.deny):
                    pd = u"D";
                    cls="deny";
                elif (perm in permsets.mask):
                    pd = u"M";
                    cls="mask";
                elif (perm in permsets.allow):
                    pd = u"A";
                    cls="allow";
                else:
                    pd = u"E";
                    cls="";
                %>
                
                <div class="permission-label ${cls}"> ${pd} </div>
            </td>
        </tr>
        %endfor
        </tbody>
    %endfor
</table>
