import { useEffect, useState } from 'react';
import { plural } from '../../lib/plural';
import { importFromHash, startProgress } from '../../lib/progress';

/** Принимает прогресс из ссылки `#p=…` на любой странице и сообщает, сколько уроков добавилось. */
export default function ProgressImport() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    startProgress();
    const take = () => {
      if (!location.hash.includes('p=')) return;
      const added = importFromHash();
      setMessage(added
        ? `Прогресс перенесён: +${added} ${plural(added, 'урок', 'урока', 'уроков')}`
        : 'Прогресс из ссылки уже есть на этом устройстве');
    };
    take();
    window.addEventListener('hashchange', take);
    return () => window.removeEventListener('hashchange', take);
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(id);
  }, [message]);

  return <div className="sg-toast" role="status" data-open={message ? '' : undefined}>{message}</div>;
}
