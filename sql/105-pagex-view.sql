drop view if exists adoc;

create or replace view adoc.pagex as
  select
    f.id,
    f.path,
    f.xid,
    f.lang,
    f.data,
    p.pageno,
    p.raw_text,
    p.tsv
  from adoc.page as p
  join adoc.file as f on (f.id = p.file_id)
  ;
