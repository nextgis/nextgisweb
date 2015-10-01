#### `97ad027f58f4b20453dc1cf3b32897c73a4daa3e` (2015-10-01)

```sql
ALTER TABLE auth_principal ADD COLUMN description character varying;
ALTER TABLE auth_user ADD COLUMN superuser boolean;
ALTER TABLE auth_user ALTER COLUMN superuser SET NOT NULL;
ALTER TABLE auth_user ADD COLUMN disabled boolean;
ALTER TABLE auth_user ALTER COLUMN disabled SET NOT NULL;
```