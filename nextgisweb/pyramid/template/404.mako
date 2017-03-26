<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="title()">${page_title}</%def>

<%def name="head()">
    <% import json %>

    <script type="text/javascript">
        require([
            "dojo/parser",
            "dojo/ready"
        ], function (
            parser,
            ready
        ) {
            ready(function() {
                parser.parse();
            });
        });
    </script>
</%def>

${message_question} <a href="${link_contact_us}" target="_blank">${link_text}</a>.