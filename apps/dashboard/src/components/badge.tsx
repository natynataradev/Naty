interface BadgeProps {
  label: string;
  variant?: 'green' | 'blue' | 'gray' | 'red';
  showDot?: boolean;
}

const VARIANTS: Record<string, string> = {
  green: 'bg-naty-green/10 text-naty-green border border-naty-green/20',
  blue: 'bg-naty-blue/10 text-naty-blue border border-naty-blue/20',
  gray: 'bg-white/5 text-gray-400 border border-white/10',
  red: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const DOT_COLORS: Record<string, string> = {
  green: 'bg-naty-green',
  blue: 'bg-naty-blue',
  gray: 'bg-gray-500',
  red: 'bg-red-400',
};

export function Badge({ label, variant = 'gray', showDot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}>
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[variant]} animate-pulse`} />}
      {label}
    </span>
  );
}
