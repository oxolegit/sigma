import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { $progress, startProgress, type ProgressMap } from '../../lib/progress';

const EMPTY: ProgressMap = {};

/**
 * Прогресс из браузера. До монтирования компонента — пустой, как в серверном HTML:
 * иначе остров, гидрирующийся после другого (уже загрузившего прогресс), отрисовал бы
 * при гидрации не то, что пришло с сервера, и React сообщил бы о расхождении (#418).
 */
export function useProgress(): ProgressMap {
  const map = useStore($progress);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    startProgress();
    setMounted(true);
  }, []);
  return mounted ? map : EMPTY;
}
