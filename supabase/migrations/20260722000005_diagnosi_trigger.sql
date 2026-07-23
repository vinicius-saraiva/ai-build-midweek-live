-- Diagnosi: quali trigger sono davvero attaccati a visite ed eventi_clinici?
do $$
declare r record;
begin
  for r in
    select c.relname as tabella, t.tgname as trigger_nome, p.proname as funzione
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_proc  p on p.oid = t.tgfoid
    where not t.tgisinternal and c.relname in ('visite','eventi_clinici','pazienti')
    order by c.relname, t.tgname
  loop
    raise notice 'TRIGGER  %  ->  %  (funzione %)', r.tabella, r.trigger_nome, r.funzione;
  end loop;
end $$;
