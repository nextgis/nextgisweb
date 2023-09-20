from nextgisweb.env.i18n import extraction_root

extraction_amd = extraction_root.dir(r"^amd$", {"amd"})
extraction_amd.ignore("[/^]node_modules$")
extraction_amd.file(r"\.js$", "javascript")
extraction_amd.file(r"\.hbs$", "handlebars")

extraction_template = extraction_root.dir(r"^template$", {"server"})
extraction_template.ignore(r"[/^]__pycache__$")
extraction_template.file(r"\.mako$", "mako")
