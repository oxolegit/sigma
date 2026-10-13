import { useEffect } from 'react';
import { rememberVisit, type LastVisit } from '../../lib/progress';

/** Запоминает открытый урок для «Продолжить». Ничего не рисует. */
export default function RememberVisit(visit: LastVisit) {
  useEffect(() => rememberVisit(visit), [visit.href]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
