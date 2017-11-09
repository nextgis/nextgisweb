<%inherit file="nextgisweb:pyramid/template/base.mako" />
<%! from nextgisweb.auth.util import _ %>

    <form class="auth-form pure-form pure-form-stacked"
        method="POST">
        <h1 class="auth-form__title">${tr(_('Sign in to Web GIS'))}</h1>

        %if error:
            <div class="auth-form__error">${error}</div>
        %endif
        <div class="pure-control-group">
            <input name="login" type="text" required placeholder="${tr(_('Login'))}">
        </div>
        <div class="pure-control-group">
            <input name="password" type="password" required placeholder="${tr(_('Password'))}">
        </div>
        <button class="auth-form__btn dijit dijitReset dijitInline dijitButton--primary dijitButton"
                type="submit" value="" class="pure-button pure-button-primary">
            <span class="dijitReset dijitInline dijitButtonNode" >
                <span>
                    ${tr(_('Sign in'))}
                </span>
            </span>
        </button>
    </form>