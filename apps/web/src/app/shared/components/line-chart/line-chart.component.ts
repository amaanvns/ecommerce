import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface LineChartPoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-line-chart',
  imports: [DecimalPipe],
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      class="w-full h-auto"
      preserveAspectRatio="none"
    >
      <!-- Horizontal grid -->
      @for (g of gridLines(); track g.y) {
        <line
          [attr.x1]="padding.l"
          [attr.x2]="width - padding.r"
          [attr.y1]="g.y"
          [attr.y2]="g.y"
          stroke="currentColor"
          class="text-ink-100"
          stroke-width="1"
        />
      }

      <!-- Filled area below the line -->
      @if (areaPath()) {
        <path [attr.d]="areaPath()" fill="currentColor" class="text-ink/5" />
      }

      <!-- Line -->
      @if (linePath()) {
        <path
          [attr.d]="linePath()"
          fill="none"
          stroke="currentColor"
          class="text-ink"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      }

      <!-- Points -->
      @for (pt of plotted(); track $index) {
        <circle
          [attr.cx]="pt.x"
          [attr.cy]="pt.y"
          r="2.5"
          fill="currentColor"
          class="text-ink opacity-0 hover:opacity-100"
        >
          <title>{{ pt.point.label }} · {{ pt.point.value | number: '1.0-0' }}</title>
        </circle>
      }

      <!-- Y-axis range labels -->
      <text
        [attr.x]="padding.l - 8"
        [attr.y]="padding.t + 4"
        text-anchor="end"
        fill="currentColor"
        class="text-ink-400 text-[10px]"
      >
        {{ maxValue() | number: '1.0-0' }}
      </text>
      <text
        [attr.x]="padding.l - 8"
        [attr.y]="height - padding.b + 4"
        text-anchor="end"
        fill="currentColor"
        class="text-ink-400 text-[10px]"
      >
        0
      </text>

      <!-- X-axis: first/last labels -->
      @if (data().length > 0) {
        <text
          [attr.x]="padding.l"
          [attr.y]="height - 6"
          text-anchor="start"
          fill="currentColor"
          class="text-ink-400 text-[10px]"
        >
          {{ data()[0].label }}
        </text>
        <text
          [attr.x]="width - padding.r"
          [attr.y]="height - 6"
          text-anchor="end"
          fill="currentColor"
          class="text-ink-400 text-[10px]"
        >
          {{ data()[data().length - 1].label }}
        </text>
      }
    </svg>
  `,
})
export class LineChartComponent {
  readonly data = input.required<LineChartPoint[]>();

  readonly width = 800;
  readonly height = 240;
  readonly padding = { t: 16, r: 16, b: 28, l: 40 };

  readonly maxValue = computed(() => {
    const max = Math.max(0, ...this.data().map((d) => d.value));
    // Round up to a nice ceiling
    if (max === 0) return 1;
    const power = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / power) * power;
  });

  readonly plotted = computed(() => {
    const data = this.data();
    if (data.length === 0) return [];
    const max = this.maxValue();
    const innerW = this.width - this.padding.l - this.padding.r;
    const innerH = this.height - this.padding.t - this.padding.b;
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

    return data.map((point, i) => ({
      point,
      x: this.padding.l + i * stepX,
      y: this.padding.t + innerH - (point.value / max) * innerH,
    }));
  });

  readonly linePath = computed(() => {
    const pts = this.plotted();
    if (pts.length === 0) return '';
    return pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.plotted();
    if (pts.length === 0) return '';
    const baseY = this.height - this.padding.b;
    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');
    return `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${baseY} L ${pts[0].x.toFixed(2)} ${baseY} Z`;
  });

  readonly gridLines = computed(() => {
    const innerH = this.height - this.padding.t - this.padding.b;
    const lines = 4;
    return Array.from({ length: lines + 1 }, (_, i) => ({
      y: this.padding.t + (innerH / lines) * i,
    }));
  });
}
