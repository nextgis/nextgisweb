<%inherit file='nextgisweb:pyramid/template/base.mako' />

<div class="ngw-pyramid-layout">
    <%include file="nextgisweb:pyramid/template/header.mako"/>
    <div
        id="content"
        class="ngw-pyramid-layout-crow"
        style="justify-content: center; align-items: center; padding: 24px; background-color: #fafafa;"
    />
</div>

<script type="text/javascript">
    ngwEntry(${json_js(entrypoint)}).then(({authStore}) => {
        authStore.runApp(
            ${json_js(props)},
            document.getElementById('content')
        );
    })
</script>
