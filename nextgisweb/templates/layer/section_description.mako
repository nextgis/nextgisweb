%if obj.description == '':
    <p class="empty"><i>У этого слоя еще нет описания</i></p>
%else:
    <p>${obj.description}</p>
%endif