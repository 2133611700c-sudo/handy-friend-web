-- read-only schema contract probe
-- expected psql variables:
--   required_tables_csv
--   required_views_csv

with required_tables as (
  select trim(value) as name
  from regexp_split_to_table(:'required_tables_csv', ',') value
  where trim(value) <> ''
), required_views as (
  select trim(value) as name
  from regexp_split_to_table(:'required_views_csv', ',') value
  where trim(value) <> ''
), existing_tables as (
  select table_name as name
  from information_schema.tables
  where table_schema = 'public' and table_type in ('BASE TABLE', 'FOREIGN TABLE')
), existing_views as (
  select table_name as name
  from information_schema.views
  where table_schema = 'public'
)
select 'table' as object_type, r.name as object_name
from required_tables r
left join existing_tables e on e.name = r.name
where e.name is null
union all
select 'view' as object_type, r.name as object_name
from required_views r
left join existing_views e on e.name = r.name
where e.name is null
order by object_type, object_name;
