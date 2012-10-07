<%inherit file='../base.mako' />

<h1>${obj.display_name}</h1>

<dl>
  %for key, value in obj.get_info():
  <dt>${key}<dt>
  <dd>${value}<dd>
  %endfor
</dl>

<h2>Стили</h2>
<ul>
%for style in obj.styles:
    <li>
        <a href="${style.permalink(request)}">
            ${style.display_name}
        </a>
    </li>
%endfor
</ul>

%if hasattr(next, 'body'):
  ${next.body()}
%endif


<h2>Описание</h2>
%if obj.description == '':
    <p class="empty"><i>У этого слоя еще нет описания</i></p>
%else:
    <p>${obj.description}</p>
%endif