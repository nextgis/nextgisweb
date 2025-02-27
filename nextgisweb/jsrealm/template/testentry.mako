<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="has_sidebar()"><% return selected is not None %></%def>
<%def name="sidebar()">${dynmenu()}</%def>

<%def name="dynmenu()">
    <script type="text/javascript">
        (function () {
            const element = document.createElement("div");
            const current = document.currentScript;
            current.parentNode.insertBefore(element, current.nextSibling);
            ngwEntry("@nextgisweb/jsrealm/testentry/runner").then(({ menu }) => {
                menu(${selected | json_js}, element);
            });
        })();
    </script>
</%def>

%if not selected:
    ${dynmenu()}
%else:
    <script type="text/javascript">
        (function () {
            const element = document.createElement("div");
            const current = document.currentScript;
            current.parentNode.insertBefore(element, current.nextSibling);

            ngwEntry("@nextgisweb/jsrealm/testentry/runner").then(({ default: runner }) => {
                runner(${(selected or "") | json_js}, element);
            });
        })();
    </script>
%endif
