from nextgisweb.env.i18n import extraction_root

extraction_nodepkg = extraction_root.dir(r"^nodepkg$", {"jsrealm"})
extraction_nodepkg.file(r"\.[jt]sx?$", "javascript")
