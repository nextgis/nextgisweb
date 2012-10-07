<%inherit file='../obj.mako' />
<%namespace file='util.mako' import="*"/>


<h2>Группы</h2>

%if len(obj.children) == 0:
  <i>В этой группе пока нет подгрупп</i>
%else:
  <ul>
  %for subgroup in obj.children:
    <li><a href="${subgroup.permalink(request)}">${subgroup.display_name}</a></li>
  %endfor
  </ul>
%endif

<h2>Слои</h2>

%if len(obj.layers) == 0:
  <i>В этой группе пока нет слоёв</i>
%else:
  <ul>
  %for layer in obj.layers:
    <li><a href="${layer.permalink(request)}">${layer.display_name}</a></li>
  %endfor
  </ul>
%endif

<h2>Описание</h2>
%if obj.description == '':
    <p class="empty"><i>У этой группы слоев еще нет описания</i></p>
%else:
    <p>${obj.description}</p>
%endif

<h2>Ограничения доступа</h2>

${obj.acl.get_effective_permissions(request.user)}