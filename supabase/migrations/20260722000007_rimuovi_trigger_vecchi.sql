-- Il database aveva già due trigger, installati insieme ai dati:
--
--   trg_visita_inserita  -> aggiorna_stato_da_visita
--        n_visite = n_visite + 1
--        Incrementale: conta anche le 2.726 visite duplicate (da qui il
--        max 118 invece di 93) e non gestisce UPDATE/DELETE.
--
--   trg_evento_inserito  -> aggiorna_stato_da_evento
--        n_ps_12m = n_ps_12m + (data > oggi() - 365)
--        Valuta oggi() AL MOMENTO DELLA SCRITTURA: la finestra resta congelata
--        a quando la riga è stata inserita. È il valore che dipende da "oggi"
--        che CLAUDE.md vieta di salvare. Non manteneva né ps_scoperto_il
--        né n_ps_totale.
--
-- Sommati ai nostri, producevano n_visite = 2 dopo un solo inserimento.
-- I nostri (trg_stato_paziente -> ricalcola_stato_paziente) ricalcolano da
-- zero, deduplicano, coprono INSERT/UPDATE/DELETE e tengono ps_scoperto_il.
--
-- Rimuoviamo solo i TRIGGER. Le funzioni restano: se questa scelta va rivista,
-- basta ricreare i due trigger. Niente è perduto.

drop trigger if exists trg_visita_inserita on visite;
drop trigger if exists trg_evento_inserito on eventi_clinici;

comment on column pazienti.n_ps_12m is
  'OBSOLETA — non più mantenuta. Finestra di 12 mesi congelata al momento del '
  'caricamento: dipende da "oggi" e scade in silenzio. Usare n_ps_totale '
  '(indipendente da oggi) o derivare la finestra in lettura da eventi_clinici.';

comment on column pazienti.ps_scoperto_il is
  'Data dell''ultimo accesso al PS dopo il quale non risulta nessuna visita. '
  'NULL = ricontattato, o mai al PS. Non dipende da "oggi": i giorni si '
  'derivano in lettura.';
