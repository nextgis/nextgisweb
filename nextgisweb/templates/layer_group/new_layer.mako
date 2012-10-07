<%inherit file='../base.mako' />
<%namespace file="util.mako" import="*" />
<%namespace file="../wtforms.mako" import="*" />

${title_block()}

<form method="POST" enctype="multipart/form-data">
    <fieldset>
    ${render_form(form)}
    <input type="submit" />
    </fieldset>
</form>