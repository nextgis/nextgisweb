<%! from nextgisweb.pyramid.view import test_exception_transaction %>

<%inherit file='nextgisweb:pyramid/template/plain.mako' />

<% test_exception_transaction(request) %>
