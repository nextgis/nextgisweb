<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>

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

${tr(_('Think this page should be here?'))}
<a href="${tr(_('http://nextgis.com/contact/'))}"
  target="_blank">${tr(_('Contact us'))}</a>.
