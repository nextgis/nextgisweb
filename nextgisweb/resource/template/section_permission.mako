<% permsets = obj.permission_sets(request.user) %>
<div class="table-wrapper">
    <table class="pure-table pure-table-horizontal">
        %for k, scope in six.iteritems(obj.scope):
            <thead><tr>
                <th style="width: 70%; text-align: inherit;">${tr(scope.label)}</th>
                <th style="width: 30%; text-align: inherit;"><tt>${k}</tt></th>
                <th style="width: 0%">&nbsp;</th>
            </tr></thead>
            <tbody>
            %for perm in scope.values(ordered=True):
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
</div>
