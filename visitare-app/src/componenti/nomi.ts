// Come si scrive il nome di una persona, in un posto solo.
// Sta fuori dai componenti perché lo usano intestazione, selettore e guscio:
// un file che esporta componenti e funzioni insieme rompe il fast refresh.

import type { Professionista } from '../dati/contratto';

export function nomeCompleto(p: Professionista): string {
  return `${p.nome} ${p.cognome}`;
}
