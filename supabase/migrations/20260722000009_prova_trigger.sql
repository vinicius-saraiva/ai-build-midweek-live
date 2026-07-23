-- Prova che il trigger sia VIVO, non solo attaccato.
-- Tutto dentro un blocco atomico: se un controllo fallisce, l'eccezione fa
-- rollback dell'intera migrazione e non resta nessuna riga di prova.
-- Se passa, la riga di prova viene cancellata e lo stato torna com'era.

do $$
declare
  v_paz  text;
  v_prof text;
  v_data date := date '2025-06-16';   -- un lunedì, dentro il periodo dei dati
  v_ultima date;
  v_n      int;
begin
  -- un paziente mai visitato: la variazione è inequivocabile
  select p.paziente_id, pr.professionista_id into v_paz, v_prof
  from pazienti p
  join professionisti pr on pr.equipe_id = p.equipe_id
  where p.ultima_visita is null
  limit 1;

  if v_paz is null then
    raise exception 'prova trigger: nessun paziente mai visitato disponibile';
  end if;

  -- stato di partenza
  select ultima_visita, n_visite into v_ultima, v_n from pazienti where paziente_id = v_paz;
  if v_ultima is not null or v_n <> 0 then
    raise exception 'prova trigger: stato di partenza inatteso (% / %)', v_ultima, v_n;
  end if;

  -- INSERT: il trigger deve valorizzare ultima_visita e portare n_visite a 1
  insert into visite (professionista_id, registrata_il, ordine_visita_giorno, paziente_id)
  values (v_prof, v_data, 1, v_paz);

  select ultima_visita, n_visite into v_ultima, v_n from pazienti where paziente_id = v_paz;
  if v_ultima is distinct from v_data then
    raise exception 'prova trigger: ultima_visita non aggiornata (attesa %, trovata %)', v_data, v_ultima;
  end if;
  if v_n <> 1 then
    raise exception 'prova trigger: n_visite non aggiornato (atteso 1, trovato %)', v_n;
  end if;

  -- DELETE: il trigger deve riportare lo stato a "mai visitato"
  delete from visite
  where professionista_id = v_prof and registrata_il = v_data and paziente_id = v_paz;

  select ultima_visita, n_visite into v_ultima, v_n from pazienti where paziente_id = v_paz;
  if v_ultima is not null or v_n <> 0 then
    raise exception 'prova trigger: stato non ripristinato dopo DELETE (% / %)', v_ultima, v_n;
  end if;

  raise notice 'prova trigger superata su paziente % (nessun residuo)', v_paz;
end $$;
