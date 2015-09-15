<%inherit file='nextgisweb:templates/base.mako' />

<%def name="head()">
    <script>
        require(["dojo/parser", "dojo/ready"], function (parser, ready) {
            ready(function() { parser.parse(); });
        });
    </script>
</%def>

<div data-dojo-type="ngw-file-upload/Uploader"></div>

