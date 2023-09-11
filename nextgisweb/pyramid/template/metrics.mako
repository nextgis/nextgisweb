<%
    try:
        settings = request.env.core.settings_get('pyramid', 'metrics')
    except KeyError:
        settings = {}
%>

<% ym = settings.get("yandex_metrica") %>
%if ym:
    <script type="text/javascript">
        (function (m, e, t, r, i, k, a) {
            m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) };
            m[i].l = 1 * new Date();
            for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
            k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
        })
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
        ym(${json_js(ym["id"])}, "init", { webvisor: ${json_js(ym.get("webvisor", False))}, clickmap: true, trackLinks: true, accurateTrackBounce: true });
    </script>
%endif

<% ga = settings.get("google_analytics") %>
%if ga:
    <script async src="https://www.googletagmanager.com/gtag/js?id=${ga['id']}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag("js", new Date());
        gtag("config", ${json_js(ga["id"])});
    </script>
%endif
