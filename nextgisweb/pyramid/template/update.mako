<%! from nextgisweb.pyramid.view import UPDATE_JSENTRY %>

%if request.env.ngupdate_url:
    <script type="text/javascript">
        ngwEntry(${json_js(UPDATE_JSENTRY)}).then(({ init }) => init());
    </script>
%endif
