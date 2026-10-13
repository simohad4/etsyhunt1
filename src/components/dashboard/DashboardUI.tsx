import React from 'react';
import { Search, X } from 'lucide-react';

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type StatTone = 'neutral' | 'indigo' | 'green' | 'yellow' | 'red';

const statusToneClasses: Record<StatusTone, string> = {
  neutral: 'border-[#2b2b32] bg-[#17171c] text-[#a1a1aa]',
  info: 'border-[#6c70dc]/35 bg-[#6c70dc]/10 text-[#b6b8ff]',
  success: 'border-[#30a46c]/30 bg-[#30a46c]/10 text-[#65d39a]',
  warning: 'border-[#d6b84c]/30 bg-[#d6b84c]/10 text-[#e8d58c]',
  danger: 'border-[#e5484d]/30 bg-[#e5484d]/10 text-[#ff8b8f]'
};

const statToneClasses: Record<StatTone, string> = {
  neutral: 'bg-[#202027] text-[#b5b5be]',
  indigo: 'bg-[#6c70dc]/12 text-[#a9acff]',
  green: 'bg-[#30a46c]/10 text-[#65d39a]',
  yellow: 'bg-[#d6b84c]/10 text-[#e8d58c]',
  red: 'bg-[#e5484d]/10 text-[#ff8b8f]'
};

interface DashboardPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DashboardPageHeader({ eyebrow, title, description, icon, meta, actions }: DashboardPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[#24242b] pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2b2b34] bg-[#17171d] text-[#9da0ff]">{icon}</div>}
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7e82e8]">{eyebrow}</div>}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-[-0.025em] text-[#f4f4f5] sm:text-2xl">{title}</h1>
            {meta}
          </div>
          {description && <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#91919b] sm:text-[13px]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}

interface DashboardStatCardProps {
  label: string;
  value: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  tone?: StatTone;
}

export function DashboardStatCard({ label, value, description, icon, tone = 'neutral' }: DashboardStatCardProps) {
  return (
    <div className="group rounded-lg border border-[#24242b] bg-[#131317] p-4 transition-colors duration-150 hover:border-[#363640] hover:bg-[#15151a]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-[#91919b]">{label}</div>
          <div className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.035em] text-[#f4f4f5]">{value}</div>
        </div>
        {icon && <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${statToneClasses[tone]}`}>{icon}</div>}
      </div>
      {description && <p className="mt-2 text-[11px] leading-4 text-[#70707a]">{description}</p>}
    </div>
  );
}

interface DashboardSectionCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function DashboardSectionCard({ children, title, description, icon, action, className = '', bodyClassName = 'p-4 sm:p-5' }: DashboardSectionCardProps) {
  const hasHeader = title || description || icon || action;
  return (
    <section className={`overflow-hidden rounded-lg border border-[#24242b] bg-[#131317] ${className}`}>
      {hasHeader && (
        <div className="flex flex-col gap-3 border-b border-[#24242b] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon && <div className="mt-0.5 text-[#8589ee]">{icon}</div>}
            <div>
              {title && <h2 className="text-sm font-semibold text-[#f4f4f5]">{title}</h2>}
              {description && <p className="mt-0.5 text-[11px] leading-4 text-[#91919b]">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

interface DashboardFilterBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
  resultLabel?: React.ReactNode;
}

export function DashboardFilterBar({ value, onChange, placeholder = 'Search…', ariaLabel = 'Search', children, resultLabel }: DashboardFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#24242b] bg-[#111115] p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#666670]" />
          <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={ariaLabel} className="h-9 w-full rounded-md border border-[#2b2b34] bg-[#18181d] pl-9 pr-9 text-xs text-[#f4f4f5] outline-none transition-[border-color,box-shadow] placeholder:text-[#666670] focus:border-[#7478e6] focus:ring-2 focus:ring-[#7478e6]/15" />
          {value && <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#666670] transition-colors hover:bg-[#292930] hover:text-white" aria-label="Clear search"><X className="h-3 w-3" /></button>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
      {resultLabel && <div className="shrink-0 text-[10px] tabular-nums text-[#777781]" aria-live="polite">{resultLabel}</div>}
    </div>
  );
}

export interface DashboardTableColumn<Row> {
  key: string;
  header: React.ReactNode;
  render: (row: Row) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DashboardDataTableProps<Row> {
  rows: Row[];
  columns: DashboardTableColumn<Row>[];
  getRowKey: (row: Row) => React.Key;
  caption: string;
  className?: string;
}

export function DashboardDataTable<Row>({ rows, columns, getRowKey, caption, className = '' }: DashboardDataTableProps<Row>) {
  return (
    <div className={`overflow-hidden rounded-lg border border-[#24242b] bg-[#131317] ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-[#24242b] bg-[#101014] text-[10px] uppercase tracking-[0.08em] text-[#777781]">
            <tr>{columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-3 font-medium ${column.headerClassName || ''}`}>{column.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#24242b]">
            {rows.map((row) => <tr key={getRowKey(row)} className="transition-colors hover:bg-[#18181d]">{columns.map((column) => <td key={column.key} className={`px-4 py-3 ${column.className || ''}`}>{column.render(row)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DashboardEmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export function DashboardEmptyState({ title, description, icon, action, secondaryAction }: DashboardEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[#303039] bg-[#111115] px-5 py-10 text-center sm:py-12">
      {icon && <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[#303039] bg-[#18181e] text-[#8f92f4]">{icon}</div>}
      <h2 className="mt-4 text-sm font-semibold text-[#f4f4f5]">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[#91919b]">{description}</p>
      {(action || secondaryAction) && <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">{action}{secondaryAction}</div>}
    </div>
  );
}

interface DashboardLoadingSkeletonProps { rows?: number; label?: string; }

export function DashboardLoadingSkeleton({ rows = 4, label = 'Loading dashboard data' }: DashboardLoadingSkeletonProps) {
  return (
    <div className="space-y-4" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="h-24 animate-pulse rounded-lg border border-[#24242b] bg-[#131317]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: Math.min(rows, 4) }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-lg border border-[#24242b] bg-[#131317]" />)}</div>
      <div className="overflow-hidden rounded-lg border border-[#24242b] bg-[#131317]">
        {Array.from({ length: rows }, (_, index) => <div key={index} className="flex gap-3 border-b border-[#24242b] p-4 last:border-0"><div className="h-9 w-9 animate-pulse rounded-md bg-[#1d1d23]" /><div className="flex-1 space-y-2 py-1"><div className="h-2.5 w-1/3 animate-pulse rounded bg-[#24242c]" /><div className="h-2 w-2/3 animate-pulse rounded bg-[#1d1d23]" /></div></div>)}
      </div>
    </div>
  );
}

interface DashboardStatusIndicatorProps { label: string; tone?: StatusTone; dot?: boolean; title?: string; }

export function DashboardStatusIndicator({ label, tone = 'neutral', dot = true, title }: DashboardStatusIndicatorProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${statusToneClasses[tone]}`} title={title}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {label}
    </span>
  );
}
