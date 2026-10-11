import React from 'react';
import { Search, X } from 'lucide-react';

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type StatTone = 'neutral' | 'indigo' | 'green' | 'yellow' | 'red';

const statusToneClasses: Record<StatusTone, string> = {
  neutral: 'border-[#343440] bg-[#18181f] text-[#a4a8b0]',
  info: 'border-[#5e6ad2]/40 bg-[#5e6ad2]/12 text-[#aab1ff]',
  success: 'border-[#30a46c]/35 bg-[#30a46c]/10 text-[#55c58b]',
  warning: 'border-[#f5d90a]/30 bg-[#f5d90a]/10 text-[#e8d76b]',
  danger: 'border-[#e5484d]/35 bg-[#e5484d]/10 text-[#ff7b80]'
};

const statToneClasses: Record<StatTone, string> = {
  neutral: 'bg-[#8a8f98]/10 text-[#a4a8b0]',
  indigo: 'bg-[#5e6ad2]/15 text-[#8f98ff]',
  green: 'bg-[#30a46c]/12 text-[#55c58b]',
  yellow: 'bg-[#f5d90a]/10 text-[#e8d76b]',
  red: 'bg-[#e5484d]/10 text-[#ff7b80]'
};

interface DashboardPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  icon,
  meta,
  actions
}: DashboardPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#22222b] bg-[#111117] p-4 shadow-[0_16px_44px_rgba(0,0,0,0.18)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#343447] bg-[#191923] text-[#8f98ff] shadow-[0_0_22px_rgba(94,106,210,0.12)]">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#707bfb]">
              {eyebrow}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-[-0.02em] text-[#f7f8f8] sm:text-xl">
              {title}
            </h1>
            {meta}
          </div>
          {description && (
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#8a8f98] sm:text-[13px]">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}

interface DashboardStatCardProps {
  label: string;
  value: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  tone?: StatTone;
}

export function DashboardStatCard({
  label,
  value,
  description,
  icon,
  tone = 'neutral'
}: DashboardStatCardProps) {
  return (
    <div className="group rounded-xl border border-[#22222b] bg-[#121216] p-4 transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 hover:border-[#343447] hover:bg-[#15151b]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-[#8a8f98]">{label}</div>
          <div className="mt-1 font-mono text-xl font-semibold tracking-[-0.04em] text-[#f7f8f8]">
            {value}
          </div>
        </div>
        {icon && (
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statToneClasses[tone]}`}>
            {icon}
          </div>
        )}
      </div>
      {description && <p className="mt-2 text-[11px] leading-4 text-[#575a65]">{description}</p>}
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

export function DashboardSectionCard({
  children,
  title,
  description,
  icon,
  action,
  className = '',
  bodyClassName = 'p-4 sm:p-5'
}: DashboardSectionCardProps) {
  const hasHeader = title || description || icon || action;

  return (
    <section className={`overflow-hidden rounded-xl border border-[#22222b] bg-[#121216] ${className}`}>
      {hasHeader && (
        <div className="flex flex-col gap-3 border-b border-[#22222b] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon && <div className="mt-0.5 text-[#707bfb]">{icon}</div>}
            <div>
              {title && <h2 className="text-sm font-semibold text-[#f7f8f8]">{title}</h2>}
              {description && <p className="mt-0.5 text-[11px] leading-4 text-[#8a8f98]">{description}</p>}
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

export function DashboardFilterBar({
  value,
  onChange,
  placeholder = 'Search…',
  ariaLabel = 'Search',
  children,
  resultLabel
}: DashboardFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#22222b] bg-[#111117] p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#575a65]" />
          <input
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className="h-9 w-full rounded-lg border border-[#2a2a36] bg-[#18181f] pl-9 pr-9 text-xs text-[#f7f8f8] outline-none transition-[border-color,box-shadow] placeholder:text-[#575a65] focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/15"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#575a65] transition-colors hover:bg-[#282835] hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
      {resultLabel && (
        <div className="shrink-0 font-mono text-[10px] text-[#70737e]" aria-live="polite">
          {resultLabel}
        </div>
      )}
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

export function DashboardDataTable<Row>({
  rows,
  columns,
  getRowKey,
  caption,
  className = ''
}: DashboardDataTableProps<Row>) {
  return (
    <div className={`overflow-hidden rounded-xl border border-[#22222b] bg-[#121216] ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-[#22222b] bg-[#0e0e13] font-mono text-[10px] uppercase tracking-[0.08em] text-[#70737e]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={`px-4 py-3 font-medium ${column.headerClassName || ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#22222b]/70">
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="transition-colors hover:bg-[#18181f]">
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 ${column.className || ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
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

export function DashboardEmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction
}: DashboardEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[#2d2d3a] bg-[#111117] px-5 py-12 text-center sm:py-14">
      {icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#343447] bg-[#191923] text-[#707bfb] shadow-[0_0_28px_rgba(94,106,210,0.12)]">
          {icon}
        </div>
      )}
      <h2 className="mt-4 text-sm font-semibold text-[#f7f8f8]">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[#8a8f98]">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

interface DashboardLoadingSkeletonProps {
  rows?: number;
  label?: string;
}

export function DashboardLoadingSkeleton({ rows = 4, label = 'Loading dashboard data' }: DashboardLoadingSkeletonProps) {
  return (
    <div className="space-y-4" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="h-28 animate-pulse rounded-2xl border border-[#22222b] bg-[#121216]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: Math.min(rows, 4) }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-[#22222b] bg-[#121216]" />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-[#22222b] bg-[#121216]">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex gap-3 border-b border-[#22222b] p-4 last:border-0">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-[#1c1c24]" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-[#24242e]" />
              <div className="h-2 w-2/3 animate-pulse rounded bg-[#1c1c24]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DashboardStatusIndicatorProps {
  label: string;
  tone?: StatusTone;
  dot?: boolean;
  title?: string;
}

export function DashboardStatusIndicator({
  label,
  tone = 'neutral',
  dot = true,
  title
}: DashboardStatusIndicatorProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ${statusToneClasses[tone]}`}
      title={title}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {label}
    </span>
  );
}
