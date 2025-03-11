from nextgisweb.env.i18n import extraction_root

extraction_template = extraction_root.dir(r"^template$", {"server"})
extraction_template.ignore(r"[/^]__pycache__$")
extraction_template.file(r"\.mako$", "mako")
