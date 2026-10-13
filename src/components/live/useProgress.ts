import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { $progress, startProgress } from '../../lib/progress';

/** Прогресс из браузера. На сервере и в первом кадре — пустой, чтобы гидрация совпала с HTML. */
export function useProgress() {
  useEffect(startProgress, []);
  return useStore($progress);
}
