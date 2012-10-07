<%inherit file='../base.mako' />

<ul>
%for permission in obj.permissions:
  <li>
      ${permission.display_name} [${permission.keyname}]
  </li>
%endfor
</ul>