# -*- coding: utf-8 -*-

templates_path = ['_template']
exclude_patterns = ['_build']

source_suffix = '.rst'
master_doc = 'index'

project = u'nextgisweb'
copyright = u'2014, NextGIS'

version = '2.2'
release = '2'

language = 'ru'

pygments_style = 'sphinx'

extensions = [
    'sphinx.ext.autodoc',
    'sphinxcontrib.httpdomain',
    'sphinx.ext.todo'
]

autodoc_member_order = 'bysource'
autoclass_content = 'both'

http_index_shortname = 'api'

# -- Options for HTML output ----------------------------------------------

html_theme = 'nature'
