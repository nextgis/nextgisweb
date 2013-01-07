%if len(obj.layers) == 0:
    <i>В этой группе пока нет слоёв</i>
%else:
    <ul>
        %for layer in obj.layers:
            <li><a href="${layer.permalink(request)}">${layer.display_name}</a></li>
        %endfor
    </ul>
%endif