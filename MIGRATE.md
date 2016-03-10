`-- example of upgrade command. migration.sql have to consist below sql commands`

`-- psql -d <database_name> -h 192.168.250.1 -U ngw_admin -a -f migration.sql`

#### `-- ee85d1ceb4976b20e9eeb0925b614a604554aeb7` (2016-03-08)

```sql
ALTER TABLE postgis_layer ALTER COLUMN geometry_type TYPE character varying(15);

ALTER TABLE vector_layer DROP CONSTRAINT vector_layer_geometry_type_check1;
ALTER TABLE postgis_layer DROP CONSTRAINT postgis_layer_geometry_type_check1;

ALTER TABLE postgis_layer DROP CONSTRAINT postgis_layer_geometry_type_check;
ALTER TABLE postgis_layer
  ADD CONSTRAINT postgis_layer_geometry_type_check CHECK (geometry_type::text = ANY (ARRAY['POINT'::character varying, 'LINESTRING'::character varying, 'POLYGON'::character varying, 'MULTIPOINT'::character varying, 'MULTILINESTRING'::character varying, 'MULTIPOLYGON'::character varying]::text[]));

ALTER TABLE postgis_layer DROP CONSTRAINT postgis_layer_geometry_type_check;
ALTER TABLE postgis_layer
  ADD CONSTRAINT postgis_layer_geometry_type_check CHECK (geometry_type::text = ANY (ARRAY['POINT'::character varying, 'LINESTRING'::character varying, 'POLYGON'::character varying, 'MULTIPOINT'::character varying, 'MULTILINESTRING'::character varying, 'MULTIPOLYGON'::character varying]::text[]));
```

#### `-- 3a274762cecaf81f4fca75d96421243303792cef` (2015-06-30)

```sql
ALTER TABLE wmsclient_connection ADD COLUMN username character varying;
ALTER TABLE wmsclient_connection ADD COLUMN password character varying;
```


#### `-- cebcff51486370fe3fc164d38b45b7b0b58a61c8` (2015-09-21)

```sql
ALTER TABLE wfsserver_layer ADD COLUMN maxfeatures integer;
```


#### `-- 97ad027f58f4b20453dc1cf3b32897c73a4daa3e` (2015-10-01)

```sql
ALTER TABLE auth_principal ADD COLUMN description character varying;
ALTER TABLE auth_user ADD COLUMN superuser boolean;
ALTER TABLE auth_user ADD COLUMN disabled boolean;
UPDATE auth_user SET superuser = FALSE;
UPDATE auth_user SET disabled = FALSE;
ALTER TABLE auth_user ALTER COLUMN superuser SET NOT NULL;
ALTER TABLE auth_user ALTER COLUMN disabled SET NOT NULL;
```

#### `-- 5dee01ca98d3e19e2b1598ca54bab29c6293d02c` (2015-12-28)

```sql
ALTER TABLE auth_group ADD COLUMN register boolean;
UPDATE auth_group SET register = FALSE;
ALTER TABLE auth_group ALTER COLUMN register SET NOT NULL;
```
