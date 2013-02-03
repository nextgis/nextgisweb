<%
    permissions = request.env.security.permissions[obj.acl.resource]
    permission_set = obj.acl.permission_set(request.user)
%>

<table class="data" style="width: 100%">
    <tr>
        <th>Право</th>
        <th style="width: 0;">&nbsp;</th>
    </tr>
    %for key, attr in permissions.iteritems():
        <tr>
            <td>${attr['label']}</td>
            <td>${'&#9899;' if (key in permission_set) else '&#9898;' | n}</td>
        </tr>
    %endfor
</table>