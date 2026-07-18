import { Injectable } from '@nestjs/common';

type Labels = Record<string, string | number | boolean | undefined>;

function labelKey(labels: Labels): string {
  return Object.entries(labels)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(',');
}

function renderLabels(labels: Labels): string {
  const entries = Object.entries(labels).filter(([, value]) => value !== undefined);
  if (!entries.length) return '';
  return `{${entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(',')}}`;
}

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, { name: string; labels: Labels; value: number }>();
  private readonly gauges = new Map<string, { name: string; labels: Labels; value: number }>();

  inc(name: string, labels: Labels = {}, by = 1): void {
    const key = `${name}|${labelKey(labels)}`;
    const current = this.counters.get(key) ?? { name, labels, value: 0 };
    current.value += by;
    this.counters.set(key, current);
  }

  set(name: string, value: number, labels: Labels = {}): void {
    this.gauges.set(`${name}|${labelKey(labels)}`, { name, labels, value });
  }

  observe(name: string, value: number, labels: Labels = {}): void {
    this.inc(`${name}_count`, labels);
    this.inc(`${name}_sum`, labels, value);
  }

  render(): string {
    this.set('plinko_process_uptime_seconds', Math.round(process.uptime()));
    const lines = [
      '# HELP plinko_http_requests_total Total HTTP requests by method, route, and status.',
      '# TYPE plinko_http_requests_total counter',
    ];
    for (const item of this.counters.values()) {
      lines.push(`${item.name}${renderLabels(item.labels)} ${item.value}`);
    }
    lines.push('# TYPE plinko_process_uptime_seconds gauge');
    for (const item of this.gauges.values()) {
      lines.push(`${item.name}${renderLabels(item.labels)} ${item.value}`);
    }
    return `${lines.join('\n')}\n`;
  }
}
