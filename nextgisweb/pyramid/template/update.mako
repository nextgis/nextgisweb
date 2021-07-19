%if request.env.ngupdate_url:
    <script type="text/javascript">
        require([
            "@nextgisweb/pyramid/update",
            "dojo/domReady!"
        ], function (update) {
            update.init();
        });
    </script>
%endif
