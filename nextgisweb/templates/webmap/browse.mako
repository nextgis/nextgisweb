<%inherit file='../base.mako' />

<ul>
    %for obj in obj_list:
    <li>
      <a href="${request.route_url('webmap.show', id=obj.id)}">${obj.display_name}</a><br/>
      <a href="${request.route_url('webmap.display', id=obj.id)}">Открыть</a>
    </li>
    %endfor
</ul>