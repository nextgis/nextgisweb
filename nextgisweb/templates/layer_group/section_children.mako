%if len(obj.children) == 0:
    <i>В этой группе пока нет подгрупп</i>
%else:
    <ul>
        %for subgroup in obj.children:
            <li><a href="${subgroup.permalink(request)}">${subgroup.display_name}</a></li>
        %endfor
    </ul>
%endif