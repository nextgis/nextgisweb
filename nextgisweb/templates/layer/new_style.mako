<%inherit file='../base.mako' />
<%namespace file='../wtforms.mako' import="render_form" />

<h1>${obj.display_name}</h1>

<form method="POST">
    <fieldset>
    ${render_form(form)}
    </fieldset>
</form>