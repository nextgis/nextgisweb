<%

permsets = obj.permission_sets(request.user)
from nextgisweb.resource.scope import clscopes
from nextgisweb.resource.permission import scope_permissions

%>

<table class="data" style="width: 100%">
    %for scope in reversed(list(clscopes(obj.__class__))):
        <tr>
            <th>${scope.cls_display_name}</th>
            <th><tt>${scope.identity}</tt></th>
            <th>&nbsp;</th>
        </tr>
        %for perm in scope_permissions(scope).itervalues():
        <tr>
            <td>${perm.label}</td>
            <td><tt>${perm.permission}</tt></td>
            <td>
                <%
                if (perm in permsets.deny):
                    pd = u"Запрещено"
                elif (perm in permsets.allow):
                    pd = u"Разрешено"
                else:
                    pd = u"Отсутсвует"
                %>    
                
                ${pd}
            </td>
        </tr>
        %endfor
    %endfor
</table>
