<% permsets = obj.permission_sets(request.user) %>
<div class="table-wrapper">
    <table class="pure-table pure-table-horizontal">
        %for k, scope in obj.scope.items():
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
                        pd = "D";
                        cls="deny";
                    elif (perm in permsets.mask):
                        pd = "M";
                        cls="mask";
                    elif (perm in permsets.allow):
                        pd = "A";
                        cls="allow";
                    else:
                        pd = "E";
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
