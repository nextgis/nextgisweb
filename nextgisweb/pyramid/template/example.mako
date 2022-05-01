<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%
    from pathlib import Path

    import nextgisweb
    import nextgisweb.pyramid

    root = Path(nextgisweb.pyramid.__file__).parent / 'nodepkg' / 'example'
    pkgroot = Path(nextgisweb.__file__).parent.parent
    modules = [(f.stem, f.relative_to(pkgroot)) for f in (
        list(root.glob('*.js')) + list(root.glob('*.ts')))]
    modules.sort()
%>

<script type="text/javascript">
    function runModule(name, filename) {
        var moduleName = '@nextgisweb/pyramid/example/' + name;
        var head = document.getElementById('_head'); head.innerHTML = moduleName + " from " + filename;
        var output = document.getElementById('_output'); output.innerHTML = '';
        var error = document.getElementById('_error'); error.innerHTML = '';

        require([moduleName], function (module) {
            var promise = module.default();
            promise.then(function (result) {
                output.innerHTML = result;
            });
        });
    }
</script>

%for name, fn in modules:
    <button onclick="runModule('${name}', '${fn}')">${name}</button>
%endfor

<h3 id="_head"></h3>
<div id="_output"></div>
<div id="_error"></div>
