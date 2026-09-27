export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatDate(date: string): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function cls(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(' ');
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  return new Promise((resolve) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    resolve();
  });
}
