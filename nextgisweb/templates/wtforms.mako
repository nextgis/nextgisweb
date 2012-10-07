<%def name="render_form(form)">
    %for field in form:
        %if not field.name == 'submit':
        <p>
            <label>${field.label}:</label><br/>
            %if field.errors:
                %for error in field.errors:
                    <div class="error">${error}</div>
                %endfor
            %endif
            ${field()}
        <p>
        %endif
    %endfor
    %if hasattr(form, 'submit'):
        ${form.submit}
    %endif
</%def>