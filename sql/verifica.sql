-- Visitare — verifica del blocco 0.
-- Si rilancia dopo ogni modifica allo schema o ai trigger.
-- Ogni riga deve dire ESITO = 'OK'. Nessuna soglia, nessun "circa".
--
-- I numeri attesi vengono dall'analisi in pandas sui parquet originali
-- (vedi research.md). Se uno non torna, il dato in app è sbagliato ma
-- l'app NON se ne accorgerà da sola: mostrerà semplicemente meno urgenze.

with atteso as (
  select * from (values
    ('visite deduplicate',                156873),
    ('max(n_visite)',                         93),
    ('pazienti con n_visite > 0',           49100),
    ('ps_scoperto_il valorizzato',           8059),
    ('ps_scoperto_il negli ultimi 90 gg',    4074),
    ('ps_scoperto_il negli ultimi 30 gg',    1781),
    ('mai visitati (ultima_visita null)',   48838),
    ('dislivello_m mancante',                   0),
    ('sede_quota_m mancante (pazienti)',        0),
    ('sede_quota_m mancante (equipe)',          0),
    ('pazienti totali',                     97938),
    ('equipe totali',                          49)
  ) as t(misura, valore)
),
effettivo as (
  select 'visite deduplicate' as misura,
         (select count(*) from (select distinct professionista_id, registrata_il,
                                       paziente_id from visite) d)::int as valore
  union all select 'max(n_visite)',                      (select max(n_visite) from pazienti)
  union all select 'pazienti con n_visite > 0',          (select count(*) from pazienti where n_visite > 0)::int
  union all select 'ps_scoperto_il valorizzato',         (select count(*) from pazienti where ps_scoperto_il is not null)::int
  union all select 'ps_scoperto_il negli ultimi 90 gg',  (select count(*) from pazienti where ps_scoperto_il >= oggi() - 90)::int
  union all select 'ps_scoperto_il negli ultimi 30 gg',  (select count(*) from pazienti where ps_scoperto_il >= oggi() - 30)::int
  union all select 'mai visitati (ultima_visita null)',  (select count(*) from pazienti where ultima_visita is null)::int
  union all select 'dislivello_m mancante',              (select count(*) from pazienti where dislivello_m is null)::int
  union all select 'sede_quota_m mancante (pazienti)',   (select count(*) from pazienti where sede_quota_m is null)::int
  union all select 'sede_quota_m mancante (equipe)',     (select count(*) from equipe   where sede_quota_m is null)::int
  union all select 'pazienti totali',                    (select count(*) from pazienti)::int
  union all select 'equipe totali',                      (select count(*) from equipe)::int
)
select a.misura,
       a.valore as atteso,
       e.valore as effettivo,
       case when a.valore = e.valore then 'OK' else '*** DIVERSO ***' end as esito
from atteso a join effettivo e using (misura)
order by esito, a.misura;

-- ---------------------------------------------------------------------------
-- Controlli che non sono conteggi.

-- 1. "Oggi" sta in un posto solo e vale quello che ci aspettiamo.
select 'oggi da app_config' as controllo, oggi()::text as valore,
       case when oggi() = date '2026-01-02' then 'OK' else '*** DIVERSO ***' end as esito;

-- 2. Il carico di un'équipe supera le 1.000 righe di PostgREST: è il caso che
--    smaschera la paginazione mancante lato client.
select 'pazienti per equipe' as controllo,
       min(n)::text || '–' || max(n)::text as valore,
       case when min(n) between 1990 and 2000 and max(n) between 1990 and 2000
            then 'OK' else '*** DIVERSO ***' end as esito
from (select count(*) as n from pazienti group by equipe_id) t;

-- 3. ps_scoperto_il non deve MAI essere precedente all'ultima visita:
--    se lo è, il paziente è stato ricontattato e la colonna andava azzerata.
select 'ps_scoperto_il coerente' as controllo,
       count(*)::text as valore,
       case when count(*) = 0 then 'OK' else '*** DIVERSO ***' end as esito
from pazienti
where ps_scoperto_il is not null and ultima_visita is not null
  and ps_scoperto_il <= ultima_visita;

-- 4. I trigger sono attaccati (senza, la scrittura futura non aggiornerà nulla).
select 'trigger attivi' as controllo,
       count(*)::text as valore,
       case when count(*) = 2 then 'OK' else '*** DIVERSO ***' end as esito
from pg_trigger
where tgname in ('stato_da_visite', 'stato_da_eventi') and not tgisinternal;

-- 5. Gli indici che reggono i filtri lato server esistono.
select 'indici dei filtri' as controllo,
       count(*)::text as valore,
       case when count(*) = 3 then 'OK' else '*** DIVERSO ***' end as esito
from pg_indexes
where tablename = 'pazienti'
  and indexname in ('idx_paz_equipe_disliv', 'idx_paz_mai_visitato', 'idx_paz_ps_scoperto');
