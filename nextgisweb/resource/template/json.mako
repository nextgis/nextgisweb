<%inherit file='nextgisweb:templates/obj.mako' />

<% from json import dumps %>

<pre style="background: #F1F3F9; padding: 1ex; border-left: 4px solid silver;">${dumps(objjson, ensure_ascii=False, indent=4)}</pre>