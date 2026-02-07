/**
 * Whisper System
 * Injects contextual messages into any webpage.
 * Not a notification. Not a popup. A whisper that lives INSIDE the page.
 */

interface WhisperOptions {
  type: 'awareness' | 'warning' | 'insight' | 'predator';
  text: string;
  duration?: number; // ms, default 6000
  action?: { label: string; onClick: () => void };
}

export class Whisper {
  private container: HTMLElement | null = null;
  private queue: WhisperOptions[] = [];
  private isShowing = false;

  constructor() {
    this.createContainer();
  }

  show(options: WhisperOptions) {
    if (!options.text) return;
    if (this.isShowing) {
      this.queue.push(options);
      return;
    }
    this.render(options);
  }

  private createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'parasite-whisper-root';
    document.body.appendChild(this.container);
  }

  private render(options: WhisperOptions) {
    if (!this.container) return;
    this.isShowing = true;

    const whisper = document.createElement('div');
    whisper.className = `parasite-whisper parasite-whisper--${options.type}`;

    // Icon based on type
    const icons: Record<string, string> = {
      awareness: '👁',
      warning: '⚠',
      insight: '💡',
      predator: '🦠',
    };

    whisper.innerHTML = `
      <span class="parasite-whisper__icon">${icons[options.type] || '🦠'}</span>
      <span class="parasite-whisper__text">${options.text}</span>
      ${options.action ? `<button class="parasite-whisper__action">${options.action.label}</button>` : ''}
      <button class="parasite-whisper__close">&times;</button>
    `;

    // Action button
    if (options.action) {
      const btn = whisper.querySelector('.parasite-whisper__action');
      btn?.addEventListener('click', () => {
        options.action!.onClick();
        this.dismiss(whisper);
      });
    }

    // Close button
    const closeBtn = whisper.querySelector('.parasite-whisper__close');
    closeBtn?.addEventListener('click', () => this.dismiss(whisper));

    this.container.appendChild(whisper);

    // Trigger animation
    requestAnimationFrame(() => {
      whisper.classList.add('parasite-whisper--visible');
    });

    // Auto dismiss
    const duration = options.duration ?? 6000;
    setTimeout(() => this.dismiss(whisper), duration);
  }

  private dismiss(el: HTMLElement) {
    el.classList.remove('parasite-whisper--visible');
    el.classList.add('parasite-whisper--exit');
    setTimeout(() => {
      el.remove();
      this.isShowing = false;
      // Process queue
      const next = this.queue.shift();
      if (next) this.render(next);
    }, 400);
  }
}
