-- Verifica del blocco 0 come funzione: si richiama da qualsiasi client, non
-- solo dall'editor SQL. Serve perché i controlli qui sotto falliscono in
-- SILENZIO: se ps_scoperto_il è sbagliato, l'app non si rompe, mostra
-- semplicemente meno urgenze del vero.

create or replace function verifica_blocco0()
returns table (misura text, atteso int, effettivo int, esito text)
language sql stable as $$
  with e as (
    select 'visite deduplicate' as m,
           (select count(*) from (select distinct professionista_id, registrata_il,
                                         paziente_id from visite) d)::int as v,
           156873 as a
    union all select 'max(n_visite)',                     (select max(n_visite) from pazienti), 93
    union all select 'pazienti con n_visite > 0',         (select count(*) from pazienti where n_visite > 0)::int, 49100
    union all select 'ps_scoperto_il valorizzato',        (select count(*) from pazienti where ps_scoperto_il is not null)::int, 8059
    union all select 'ps_scoperto_il ultimi 90 gg',       (select count(*) from pazienti where ps_scoperto_il >= oggi() - 90)::int, 4074
    union all select 'ps_scoperto_il ultimi 30 gg',       (select count(*) from pazienti where ps_scoperto_il >= oggi() - 30)::int, 1781
    union all select 'mai visitati',                      (select count(*) from pazienti where ultima_visita is null)::int, 48838
    union all select 'dislivello_m mancante',             (select count(*) from pazienti where dislivello_m is null)::int, 0
    union all select 'sede_quota_m mancante (pazienti)',  (select count(*) from pazienti where sede_quota_m is null)::int, 0
    union all select 'sede_quota_m mancante (equipe)',    (select count(*) from equipe where sede_quota_m is null)::int, 0
    union all select 'pazienti totali',                   (select count(*) from pazienti)::int, 97938
    -- ps_scoperto_il precedente all'ultima visita = paziente ricontattato,
    -- la colonna andava azzerata. Deve essere 0.
    union all select 'ps_scoperto_il incoerente',
           (select count(*) from pazienti
             where ps_scoperto_il is not null and ultima_visita is not null
               and ps_scoperto_il <= ultima_visita)::int, 0
    -- senza i trigger, la scrittura futura non aggiornerà niente.
    union all select 'trigger attivi',
           (select count(*) from pg_trigger
             where tgname in ('stato_da_visite','stato_da_eventi') and not tgisinternal)::int, 2
    union all select 'indici dei filtri',
           (select count(*) from pg_indexes where tablename = 'pazienti'
             and indexname in ('idx_paz_equipe_disliv','idx_paz_mai_visitato','idx_paz_ps_scoperto'))::int, 3
    union all select 'oggi = 2026-01-02',
           (select (oggi() = date '2026-01-02')::int), 1
  )
  select m, a, v, case when a = v then 'OK' else '*** DIVERSO ***' end
  from e order by (case when a = v then 1 else 0 end), m
$$;

grant execute on function verifica_blocco0 to anon, authenticated;
