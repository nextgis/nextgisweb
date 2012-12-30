<%inherit file='../base.mako' />

<%def name="head()">
    <script>
        require(["dojo/parser"], function (parser) {
            parser.parse();
        });
    </script>
</%def>

<div data-dojo-type="ngw/form/Uploader"></div>

