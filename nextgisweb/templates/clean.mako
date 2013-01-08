<%def name="clean_html(raw_html)"><%
    from lxml.html.clean import Cleaner
    cleaner = Cleaner(safe_attrs_only=True)
    return cleaner.clean_html(raw_html)
%></%def>