<%namespace file="../clean.mako" import="clean_html"/>

%if obj.description is None:
    <p class="empty"><i>У этого слоя еще нет описания</i></p>
%else:
    ${ obj.description | clean_html, n }
%endif