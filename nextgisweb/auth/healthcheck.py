from nextgisweb.core.healthcheck import HealthcheckResult, healthcheck_hook

from .component import AuthComponent


@healthcheck_hook()
def healthcheck(comp: AuthComponent) -> HealthcheckResult:
    if comp.oauth is not None:
        if error_message := comp.oauth.auth_form_check():
            return {
                "success": False,
                "message": f"OAuth code request failed: {error_message}.",
            }
    return {"success": True}
