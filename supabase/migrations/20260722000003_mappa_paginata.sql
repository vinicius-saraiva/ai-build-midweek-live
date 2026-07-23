-- L'header Range di PostgREST è IGNORATO sulle RPC in POST: chiedendo
-- "Range: 1000-1999" si riottengono le stesse 1.000 righe della prima pagina,
-- senza errore. La mappa mostrerebbe 1.000 pazienti su 1.998 e sembrerebbe a posto.
-- Quindi la paginazione della mappa è esplicita, con un ordine stabile.

drop function if exists cerca_pazienti_mappa(text, text, boolean, boolean, boolean,
  boolean, text[], text[], text[]);

create or replace function cerca_pazienti_mappa(
  p_equipe_id text, p_cerca text default null,
  p_mai_visitato boolean default false, p_ps_non_ricontattato boolean default false,
  p_non_visto_da_90 boolean default false, p_vulnerabile boolean default false,
  p_condizioni text[] default null, p_eta text[] default null, p_quota text[] default null,
  p_offset int default 0, p_limit int default 1000
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
  order by paziente_id             -- ordine stabile: senza, l'offset non è affidabile
  offset p_offset limit p_limit
$$;

grant execute on function cerca_pazienti_mappa to anon, authenticated;
