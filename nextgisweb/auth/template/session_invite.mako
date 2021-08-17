<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>

<form action="${request.route_url('pyramid.session.login')}"
    method="POST" style="text-align: center;" >

    <input name="sid" type="hidden" required value="${session_id}">
    <input name="expires" type="hidden" required value="${expires}">
    %if next_url:
        <input name="next" type="hidden" value="${next_url}">
    %endif

    <button type="submit" class="pure-button pure-button-primary" >
        ${tr(_('Sign in'))}
    </button>
</form>
