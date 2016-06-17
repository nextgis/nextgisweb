<%inherit file="nextgisweb:pyramid/template/base.mako" />
<%! from nextgisweb.auth.util import _ %>

    <form class="auth-form pure-form pure-form-stacked"
        method="POST">
		<h1 class="auth-form__title">${tr(_('Sign in to Web GIS'))}</h1>

		%if error:
	        <div class="auth-form__error">${error}</div>
	    %endif
		<div class="pure-control-group">
			<input name="login" type="text" placeholder="${tr(_('Login'))}">
		</div>
		<div class="pure-control-group">
        	<input name="password" type="password" placeholder="${tr(_('Password'))}">
        </div>	
        <button class="pure-button pure-button-primary auth-form__btn" type="submit" value="" class="pure-button pure-button-primary">${tr(_('Sign in'))}</button>
    </form>
