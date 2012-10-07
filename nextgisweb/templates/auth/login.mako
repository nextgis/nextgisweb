<%inherit file="../base.mako" />
<%namespace file="../wtforms.mako" import="render_form" />

<h1>Вход</h1>

<form method="POST">
${render_form(form)}
</form>
