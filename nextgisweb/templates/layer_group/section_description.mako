<%namespace file="../clean.mako" import="clean_html"/>

%if obj.description == '':
    <p class="empty"><i>У этой группы слоев еще нет описания</i></p>
%else:
    <p>${obj.description | clean_html, n}</p>
%endif