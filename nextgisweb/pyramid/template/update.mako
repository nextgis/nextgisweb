%if request.env.ngupdate_url:
    <script type="text/javascript">
        ngwEntry("@nextgisweb/pyramid/update/entrypoint").then(({ init }) => init());
    </script>
%endif
