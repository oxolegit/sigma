import { Button } from '../Button';

/** «Распечатать». Свёрнутые уроки раскрывает обработчик beforeprint на странице шпаргалки — он срабатывает и на Ctrl+P. */
export default function PrintButton() {
  return <Button variant="primary" onClick={() => { try { window.print(); } catch {} }}>Распечатать</Button>;
}
