import { Component, computed, inject, OnInit } from '@angular/core';
import { AiUsageService } from '../ai-usage.service';

@Component({
  selector: 'app-ai-usage-badge',
  standalone: true,
  template: `
    @if (usage.isAdmin() || usage.usage()) {
      <span
        class="inline-flex items-center gap-1 text-xs font-medium tabular-nums"
        [class]="colorClass()"
        [title]="title()"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
        {{ label() }}
      </span>
    }
  `,
})
export class AiUsageBadgeComponent implements OnInit {
  usage = inject(AiUsageService);

  label = computed(() => {
    if (this.usage.isAdmin()) return '∞';
    const u = this.usage.usage();
    return u ? `${u.remaining}/${u.limit}` : '';
  });

  colorClass = computed(() => {
    const u = this.usage.usage();
    if (this.usage.isAdmin() || !u) return 'text-gray-600 dark:text-gray-300';
    if (u.remaining <= 0) return 'text-red-700 dark:text-red-400';
    if (u.remaining <= 3) return 'text-amber-700 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-300';
  });

  title = computed(() => {
    if (this.usage.isAdmin()) return 'Sin límite de generaciones con IA';
    const u = this.usage.usage();
    if (!u) return '';
    const date = new Date(u.resetsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    return `Se renueva el ${date}`;
  });

  ngOnInit() {
    if (!this.usage.isAdmin()) {
      this.usage.load();
    }
  }
}
