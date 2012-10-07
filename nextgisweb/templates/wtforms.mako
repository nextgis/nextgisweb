<%def name="render_form(form)">
    %for field in form:
        <p>
            <label>${field.label}:</label><br/>
            %if field.errors:
                %for error in field.errors:
                    <div class="error">${error}</div>
                %endfor
            %endif
            ${field()}
        <p>
    %endfor
</%def>