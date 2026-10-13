import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'quiet' | 'ghost';
  size?: 'md' | 'sm';
  href?: string;
}

/** Кнопка действия. С `href` рендерится ссылкой. */
export function Button({ variant = 'quiet', size = 'md', className, href, type, ...rest }: ButtonProps) {
  const cls = cx('rz-btn', `rz-btn-${variant}`, `rz-btn-${size}`, className);
  if (href) return <a href={href} className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} />;
  return <button type={type ?? 'button'} className={cls} {...rest} />;
}
