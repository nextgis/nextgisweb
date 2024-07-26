<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%! from nextgisweb.pyramid.view import test_exception_transaction %>
<% test_exception_transaction(request) %>
