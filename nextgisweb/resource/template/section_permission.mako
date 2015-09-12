<% permsets = obj.permission_sets(request.user) %>

<table class="pure-table pure-table-horizontal" style="width: 100%">
    %for k, scope in obj.scope.iteritems():
        <thead><tr>
            <th style="width: 70%">${tr(scope.label)}</th>
            <th style="width: 30%"><tt>${k}</tt></th>
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
                    color = '196, 0, 0'
                elif (perm in permsets.mask):
                    pd = u"M"
                    color = '170, 56, 30'                    
                elif (perm in permsets.allow):
                    pd = u"A"
                    color = '0, 196, 0'
                else:
                    pd = u"E"
                    color = '64, 64, 64'
                %>    
                
                <div style="
                    background-color: rgba(${color}, 1);
                    padding: 2px 4px;
                    border: 1px solid rgba(0, 0, 0, 0.25);
                    border-radius: 4px;
                    font-size: 90%;
                    color: white;
                    font-weight: bolder;
                    text-align: center;">

                    ${pd}

                </div>
            </td>
        </tr>
        %endfor
        </tbody>
    %endfor
</table>
