<%inherit file='../base.mako' />
<%namespace file="../wtforms.mako" import="*" />

%if error:
    <div class="error">${error}</div>
%endif

%if no_delete:
    <div class="notice">Удалить основную группу слоев невозможно!</div>
%else:
    <form method="POST" enctype="multipart/form-data">
        <fieldset>
        ${render_form(form)}
        <input type="submit" value="Удалить"/>
        </fieldset>
    </form>    
%endif