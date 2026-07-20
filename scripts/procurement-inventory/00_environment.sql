-- Phase 1B / 00: environment metadata (read-only)
select
  current_database() as database_name,
  current_user as executed_by,
  version() as postgres_version,
  current_setting('server_version_num') as server_version_num,
  current_timestamp as captured_at;

select
  extname as extension_name,
  extversion as extension_version
from pg_extension
order by extname;

select
  nspname as schema_name
from pg_namespace
where nspname not like 'pg_%'
  and nspname <> 'information_schema'
order by nspname;
