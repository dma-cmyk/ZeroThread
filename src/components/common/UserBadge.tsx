// ユーザー種別バッジ (human / bot / anonymous)
import { Bot, User, Ghost } from 'lucide-react';
import type { AccountType } from '../../types';

interface UserBadgeProps {
  type: AccountType;
  name: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export default function UserBadge({ type, name, size = 'sm', showIcon = true }: UserBadgeProps) {
  const config = {
    human: {
      icon: User,
      bgClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      dotClass: 'bg-emerald-400',
    },
    bot: {
      icon: Bot,
      bgClass: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
      dotClass: 'bg-violet-400',
    },
    anonymous: {
      icon: Ghost,
      bgClass: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
      dotClass: 'bg-gray-400',
    },
  };

  const { icon: Icon, bgClass } = config[type];
  const iconSize = size === 'sm' ? 12 : 14;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 ${bgClass} ${textSize}`} data-testid={`badge-${type}`}>
      {showIcon && <Icon size={iconSize} />}
      {name}
    </span>
  );
}
