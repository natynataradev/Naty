interface BadgeProps {
  label: string;
  variant?: 'green' | 'blue' | 'gray' | 'red';
}

const VARIANTS: Record<string, string> = {
  green: 'bg-naty-green/20 text-naty-green',
  blue: 'bg-naty-blue/20 text-naty-blue',
  gray: 'bg-white/10 text-gray-400',
  red: 'bg-red-500/20 text-red-400',
};

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}>
      {label}
    </span>
  );
}
