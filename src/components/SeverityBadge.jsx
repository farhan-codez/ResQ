import { ShieldAlert, TriangleAlert, AlertTriangle } from 'lucide-react';

const ICONS = {
  low: ShieldAlert,
  medium: TriangleAlert,
  high: AlertTriangle,
};

const CLASSES = {
  low: 'severity-low',
  medium: 'severity-medium',
  high: 'severity-high',
};

export default function SeverityBadge({ severity, size = 'sm' }) {
  const Icon = ICONS[severity] || ShieldAlert;
  const cls = CLASSES[severity] || CLASSES.low;
  const label = (severity || 'medium').charAt(0).toUpperCase() + (severity || 'medium').slice(1);
  const textSize = size === 'lg' ? 'text-sm' : 'text-[10px]';
  const pad = size === 'lg' ? 'px-3 py-1.5' : 'px-2.5 py-1';

  return (
    <span className={`severity-badge ${cls} ${pad} ${textSize} flex items-center gap-1.5`}>
      <Icon className="w-3 h-3" strokeWidth={size === 'lg' ? 2 : 1.5} />
      {label}
    </span>
  );
}