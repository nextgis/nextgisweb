<%inherit file="../base.mako" />
<%namespace file="../layer_group/util.mako" import="title_block" />
<%namespace file="../wtforms.mako" import="render_form" />

${title_block()}

<form method="POST">
<table>
    <tr>
        <th>Субъект</th>
        <th>Право</th>
    </tr>
    
    %for itm in acl.items:
    <tr>
        <td>${itm.principal}</td>
        <td>${itm.permission}</td>
    </tr>
    %endfor
    
    <tr>
        <td>${new_item_form.principal}</td>
        <td>${new_item_form.permission}</td>
    </tr>
</table>

<input type="submit" value="Добавить" />
</form>