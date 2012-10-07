<%inherit file='../base.mako' />

<ul>
%for obj in obj_list:
  <li>
      <a href="${request.route_url('permission_category.show', keyname=obj.keyname)}">
          ${obj.display_name} [${obj.keyname}]
      </a>
  </li>
%endfor
</ul>