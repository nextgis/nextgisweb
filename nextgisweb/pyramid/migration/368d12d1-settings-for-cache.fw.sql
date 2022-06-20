/*** {
    "revision": "368d12d1", "parents": ["35e3442d"],
    "date": "2022-06-17T03:27:19",
    "message": "Settings for cache"
} ***/

INSERT INTO setting (component, name, value) VALUES
    ('pyramid', 'custom_css.ckey', '"' || substring(md5(random()::text) for 8) || '"'),
    ('pyramid', 'company_logo.ckey', '"' || substring(md5(random()::text) for 8) || '"');

INSERT INTO setting (component, name, value)
(
    SELECT 'pyramid', 'logo.ckey', '"' || substring(md5(random()::text) for 8) || '"'
    FROM setting
    WHERE component = 'pyramid' AND name = 'logo'
);
