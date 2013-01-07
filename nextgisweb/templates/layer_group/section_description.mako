%if obj.description == '':
    <p class="empty"><i>У этой группы слоев еще нет описания</i></p>
%else:
    <p>${obj.description}</p>
%endif