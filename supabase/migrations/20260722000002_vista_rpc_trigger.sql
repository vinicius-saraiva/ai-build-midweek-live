-- Visitare — blocco 0, seconda parte: vista di lettura, RPC, trigger.
-- La semantica dei filtri vive QUI e solo qui: lista, mappa e contatori la
-- condividono, così non possono divergere.

-- ------------------------------------------------------------------- oggi()
create or replace function oggi() returns date
language sql stable as $$
  select valore::date from app_config where chiave = 'oggi'
$$;

-- -------------------------------------------------------------- v_paziente
create or replace view v_paziente
with (security_invoker = on) as
select
  p.paziente_id, p.nome, p.cognome, p.fascia_eta, p.sesso,
  p.vulnerabilita_sociale, p.iperteso, p.diabetico, p.gravidanza,
  p.latitudine, p.longitudine, p.quota_m, p.dislivello_m,
  p.equipe_id, e.equipe_nome, e.area,
  e.sede_latitudine, e.sede_longitudine,
  p.ultima_visita, p.n_visite, p.ultimo_ps, p.n_ps_totale, p.ps_scoperto_il
from pazienti p
join equipe e on e.equipe_id = p.equipe_id;   -- solo equipe_id: unita_id non si joina

-- ------------------------------------------------- il filtro, in un posto solo
create or replace function pazienti_filtrati(
  p_equipe_id            text,
  p_cerca                text    default null,
  p_mai_visitato         boolean default false,
  p_ps_non_ricontattato  boolean default false,
  p_non_visto_da_90      boolean default false,
  p_vulnerabile          boolean default false,
  p_condizioni           text[]  default null,
  p_eta                  text[]  default null,
  p_quota                text[]  default null
) returns setof v_paziente
language sql stable as $$
  select * from v_paziente v
  where v.equipe_id = p_equipe_id
    and (p_cerca is null or p_cerca = ''
         or (v.nome || ' ' || v.cognome) ilike '%' || p_cerca || '%')
    and (not p_mai_visitato        or v.ultima_visita is null)
    and (not p_ps_non_ricontattato or v.ps_scoperto_il >= oggi() - 90)
    and (not p_non_visto_da_90     or v.ultima_visita is null
                                   or v.ultima_visita < oggi() - 90)
    and (not p_vulnerabile         or v.vulnerabilita_sociale)
    and (p_condizioni is null or cardinality(p_condizioni) = 0 or (
          (v.iperteso   and 'iperteso'   = any(p_condizioni)) or
          (v.diabetico  and 'diabetico'  = any(p_condizioni)) or
          (v.gravidanza and 'gravidanza' = any(p_condizioni))))
    and (p_eta is null or cardinality(p_eta) = 0 or v.fascia_eta = any(p_eta))
    and (p_quota is null or cardinality(p_quota) = 0 or (
          (v.quota_m <  50                       and '0-50'    = any(p_quota)) or
          (v.quota_m >= 50  and v.quota_m < 100  and '50-100'  = any(p_quota)) or
          (v.quota_m >= 100 and v.quota_m < 150  and '100-150' = any(p_quota)) or
          (v.quota_m >= 150                      and '150+'    = any(p_quota))))
$$;

-- ------------------------------------------------------ lista (paginata)
create or replace function cerca_pazienti(
  p_equipe_id text, p_cerca text default null,
  p_mai_visitato boolean default false, p_ps_non_ricontattato boolean default false,
  p_non_visto_da_90 boolean default false, p_vulnerabile boolean default false,
  p_condizioni text[] default null, p_eta text[] default null, p_quota text[] default null,
  p_offset int default 0, p_limit int default 50
) returns setof v_paziente
language sql stable as $$
  select * from pazienti_filtrati(p_equipe_id, p_cerca, p_mai_visitato,
      p_ps_non_ricontattato, p_non_visto_da_90, p_vulnerabile,
      p_condizioni, p_eta, p_quota)
  order by dislivello_m asc, paziente_id asc   -- con segno: prima chi sta più in basso
  offset p_offset limit p_limit
$$;

-- ------------------------------------------------- mappa (insieme completo)
-- non pagina: la mappa ha bisogno di tutti i punti filtrati insieme.
create or replace function cerca_pazienti_mappa(
  p_equipe_id text, p_cerca text default null,
  p_mai_visitato boolean default false, p_ps_non_ricontattato boolean default false,
  p_non_visto_da_90 boolean default false, p_vulnerabile boolean default false,
  p_condizioni text[] default null, p_eta text[] default null, p_quota text[] default null
) returns table (
  paziente_id text, nome text, cognome text,
  latitudine double precision, longitudine double precision,
  quota_m int, ps_scoperto_il date, ultima_visita date
)
language sql stable as $$
  select paziente_id, nome, cognome, latitudine, longitudine,
         quota_m, ps_scoperto_il, ultima_visita
  from pazienti_filtrati(p_equipe_id, p_cerca, p_mai_visitato,
      p_ps_non_ricontattato, p_non_visto_da_90, p_vulnerabile,
      p_condizioni, p_eta, p_quota)
$$;

-- ------------------------------------------------ contatori (una chiamata sola)
-- ogni contatore è calcolato sul risultato corrente, con tutti gli altri filtri attivi.
create or replace function conteggi_filtri(
  p_equipe_id text, p_cerca text default null,
  p_mai_visitato boolean default false, p_ps_non_ricontattato boolean default false,
  p_non_visto_da_90 boolean default false, p_vulnerabile boolean default false,
  p_condizioni text[] default null, p_eta text[] default null, p_quota text[] default null
) returns json
language sql stable as $$
  select json_build_object(
    'totale',            count(*),
    'maiVisitato',       count(*) filter (where ultima_visita is null),
    'psNonRicontattato', count(*) filter (where ps_scoperto_il >= oggi() - 90),
    'nonVistoDa90',      count(*) filter (where ultima_visita is null
                                             or ultima_visita < oggi() - 90),
    'vulnerabile',       count(*) filter (where vulnerabilita_sociale),
    'iperteso',          count(*) filter (where iperteso),
    'diabetico',         count(*) filter (where diabetico),
    'gravidanza',        count(*) filter (where gravidanza),
    'eta', json_build_object(
      '0-6',   count(*) filter (where fascia_eta = '0-6'),
      '6-18',  count(*) filter (where fascia_eta = '6-18'),
      '19-45', count(*) filter (where fascia_eta = '19-45'),
      '45-65', count(*) filter (where fascia_eta = '45-65'),
      '66+',   count(*) filter (where fascia_eta = '66+')),
    'quota', json_build_object(
      '0-50',    count(*) filter (where quota_m < 50),
      '50-100',  count(*) filter (where quota_m >= 50  and quota_m < 100),
      '100-150', count(*) filter (where quota_m >= 100 and quota_m < 150),
      '150+',    count(*) filter (where quota_m >= 150))
  )
  from pazienti_filtrati(p_equipe_id, p_cerca, p_mai_visitato,
      p_ps_non_ricontattato, p_non_visto_da_90, p_vulnerabile,
      p_condizioni, p_eta, p_quota)
$$;

-- ----------------------------------------------- scheda: timeline unificata
create or replace function timeline_paziente(p_paziente_id text)
returns table (data date, tipo text)
language sql stable as $$
  select distinct registrata_il as data, 'visita-acs' as tipo
    from visite where paziente_id = p_paziente_id
  union all
  select data_riferimento, tipo from eventi_clinici where paziente_id = p_paziente_id
  order by data desc
$$;

-- --------------------------------------------------------------- 6. trigger
-- l'MVP è in sola lettura, ma il trigger si mette adesso: il giorno in cui
-- arriverà la scrittura non ci deve essere niente da ripensare.
create or replace function ricalcola_stato_paziente(p_id text)
returns void language plpgsql as $$
begin
  update pazienti p set
    ultima_visita = v.uv,
    n_visite      = coalesce(v.nv, 0),
    ultimo_ps     = e.ups,
    n_ps_totale   = coalesce(e.nps, 0),
    ps_scoperto_il = case
      when e.ups is not null and (v.uv is null or e.ups > v.uv)
      then (select max(data_riferimento) from eventi_clinici
             where paziente_id = p_id and tipo = 'accesso-ps-o-ricovero'
               and (v.uv is null or data_riferimento > v.uv))
      else null end
  from (
    select max(registrata_il) as uv,
           count(*)::int      as nv
    from (select distinct professionista_id, registrata_il, paziente_id
            from visite where paziente_id = p_id) t
  ) v, (
    select max(data_riferimento) filter (where tipo = 'accesso-ps-o-ricovero') as ups,
           count(*) filter (where tipo = 'accesso-ps-o-ricovero')::int         as nps
    from eventi_clinici where paziente_id = p_id
  ) e
  where p.paziente_id = p_id;
end $$;

create or replace function trg_stato_paziente() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform ricalcola_stato_paziente(old.paziente_id);
    return old;
  end if;
  perform ricalcola_stato_paziente(new.paziente_id);
  if tg_op = 'UPDATE' and old.paziente_id <> new.paziente_id then
    perform ricalcola_stato_paziente(old.paziente_id);
  end if;
  return new;
end $$;

drop trigger if exists stato_da_visite on visite;
create trigger stato_da_visite after insert or update or delete on visite
  for each row execute function trg_stato_paziente();

drop trigger if exists stato_da_eventi on eventi_clinici;
create trigger stato_da_eventi after insert or update or delete on eventi_clinici
  for each row execute function trg_stato_paziente();

-- ------------------------------------------------------------------ permessi
grant select on v_paziente to anon, authenticated;
grant execute on function oggi, pazienti_filtrati, cerca_pazienti,
  cerca_pazienti_mappa, conteggi_filtri, timeline_paziente to anon, authenticated;
