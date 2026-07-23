-- Visitare — blocco 0
-- Colonne di stato indipendenti da "oggi", indici, vista di lettura e trigger.
-- Regola: si salvano DATE, i giorni si derivano in lettura.

-- ---------------------------------------------------------------- 1. quota sede
alter table equipe add column if not exists sede_quota_m int;

update equipe set sede_quota_m = q.v from (values
  ('Centro Municipal de Saúde Dr Albert Sabin',  190),
  ('Centro Municipal de Saúde Rodolpho Perisse', 117),
  ('Centro Municipal de Saúde Vila Canoas',       48),
  ('Clínica da Família Avenida Presidente',       34),
  ('Clínica da Família Largo do Elefante',        17),
  ('Clínica da Família Maria do Socorro',         54),
  ('Clínica da Família Pedra Bonita',             74),
  ('Clínica da Família Rinaldo de Lamare',         9),
  ('Clínica da Família Rua da Paz',              205)
) as q(nome, v) where equipe.unita_nome = q.nome;

alter table equipe alter column sede_quota_m set not null;

-- --------------------------------------------------- 2. dislivello sul paziente
-- denormalizzata perché una colonna generata non può leggere un'altra tabella.
-- ATTENZIONE: il join è su equipe_id. unita_id usa due schemi di hash diversi
-- fra pazienti ed equipe (intersezione zero): non si joina.
alter table pazienti add column if not exists sede_quota_m int;

update pazienti p set sede_quota_m = e.sede_quota_m
from equipe e where e.equipe_id = p.equipe_id;

alter table pazienti alter column sede_quota_m set not null;

alter table pazienti drop column if exists dislivello_m;
alter table pazienti add column dislivello_m int
  generated always as (quota_m - sede_quota_m) stored;

-- ------------------------------------------------------------ 3. n_visite pulito
-- le visite contengono 2.726 coppie duplicate: senza distinct, n_visite è gonfio
-- (max 118 invece di 93) e il numero è visibile all'utente in scheda.
update pazienti set n_visite = 0 where n_visite <> 0;

with c as (
  select paziente_id, count(*)::int as n
  from (select distinct professionista_id, registrata_il, paziente_id from visite) t
  group by paziente_id
)
update pazienti p set n_visite = c.n from c where c.paziente_id = p.paziente_id;

-- ------------------------------------------------------- 4. ps_scoperto_il
-- data dell'ultimo accesso al PS dopo il quale non risulta nessuna visita.
-- NULL = ricontattato, o mai al PS. Non dipende da "oggi": è una data.
alter table pazienti add column if not exists ps_scoperto_il date;

with ultima as (
  select paziente_id, max(registrata_il) as uv from visite group by paziente_id
),
scoperto as (
  select e.paziente_id, max(e.data_riferimento) as d
  from eventi_clinici e
  left join ultima u on u.paziente_id = e.paziente_id
  where e.tipo = 'accesso-ps-o-ricovero'
    and (u.uv is null or e.data_riferimento > u.uv)
  group by e.paziente_id
)
update pazienti p set ps_scoperto_il = s.d
from scoperto s where s.paziente_id = p.paziente_id;

-- n_ps_12m: finestra di 12 mesi congelata attorno a "oggi", scade in silenzio.
-- Sostituita da un totale indipendente da oggi. La vecchia resta ma esce dal contratto.
alter table pazienti add column if not exists n_ps_totale int not null default 0;

with c as (
  select paziente_id, count(*)::int as n from eventi_clinici
  where tipo = 'accesso-ps-o-ricovero' group by paziente_id
)
update pazienti p set n_ps_totale = c.n from c where c.paziente_id = p.paziente_id;

-- ----------------------------------------------------------------- 5. indici
create index if not exists idx_paz_equipe_disliv on pazienti (equipe_id, dislivello_m);
create index if not exists idx_paz_mai_visitato  on pazienti (equipe_id) where ultima_visita is null;
create index if not exists idx_paz_ps_scoperto   on pazienti (equipe_id) where ps_scoperto_il is not null;
create index if not exists idx_visite_paziente   on visite (paziente_id);
create index if not exists idx_eventi_paziente   on eventi_clinici (paziente_id);
