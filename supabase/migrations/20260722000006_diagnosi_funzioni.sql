do $$
declare r record;
begin
  for r in select proname, prosrc from pg_proc
    where proname in ('aggiorna_stato_da_visita','aggiorna_stato_da_evento')
  loop
    raise notice E'=== % ===\n%', r.proname, r.prosrc;
  end loop;
end $$;
