import type { ReactNode } from 'react';

export interface BadgeProps { tone?: 'neutral' | 'accent' | 'signal' | 'example'; children?: ReactNode }

/** Короткая метка прописными. `example` — обязательна на курсах-заглушках. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`rz-badge rz-badge-${tone}`}>{children}</span>;
}
