<% import json %>
<script src="https://browser.sentry-cdn.com/5.5.0/bundle.min.js" crossorigin="anonymous"></script>
<script type="text/javascript">
    Sentry.init({dsn: ${json.dumps(request.env.pyramid.settings['sentry_url']) | n }});
</script>
