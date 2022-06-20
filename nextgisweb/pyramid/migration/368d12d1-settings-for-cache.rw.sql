/*** { "revision": "368d12d1" } ***/

DELETE FROM setting
WHERE component = 'pyramid' AND name in ('custom_css.ckey', 'logo.ckey', 'company_logo.ckey');
