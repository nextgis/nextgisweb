<%inherit file='../base.mako' />

<ul>
%for obj in obj_list:
  <li>
      ${obj.display_name} [${obj.keyname}]
  </li>
%endfor
</ul>