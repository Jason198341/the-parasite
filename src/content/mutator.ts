/**
 * Layer 2: Mutator
 * Modifies the DOM of host pages. Hunts dark patterns.
 * Breaks infinite scroll. Neutralizes manipulation.
 */
import { Whisper } from './whisper';

export class Mutator {
  private whisper: Whisper;
  private mutationObserver: MutationObserver | null = null;

  constructor(whisper: Whisper) {
    this.whisper = whisper;
  }

  start() {
    this.huntDarkPatterns();
    this.watchForNewContent();
  }

  /** Scan page for known dark patterns and flag them */
  huntDarkPatterns() {
    this.findFakeUrgency();
    this.findFakeCountdowns();
    this.findManipulativeLanguage();
  }

  /** Watch for dynamically loaded content (SPA, infinite scroll) */
  private watchForNewContent() {
    this.mutationObserver = new MutationObserver((mutations) => {
      let hasNewNodes = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          hasNewNodes = true;
          break;
        }
      }
      if (hasNewNodes) {
        this.huntDarkPatterns();
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /** Find "Only X left!" / "Y people are viewing" urgency patterns */
  private findFakeUrgency() {
    const urgencyPatterns = [
      /only \d+ left/i,
      /\d+ people (are )?(viewing|watching|looking)/i,
      /limited (stock|time|offer|quantity)/i,
      /selling fast/i,
      /hurry/i,
      /don'?t miss out/i,
      /last chance/i,
      // Korean
      /\d+개 남음/,
      /\d+명이 보는 중/,
      /한정 (수량|기간|특가)/,
      /품절 임박/,
      /서두르세요/,
      /놓치지 마세요/,
    ];

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim() || '';
      if (text.length < 5 || text.length > 200) continue;

      for (const pattern of urgencyPatterns) {
        if (pattern.test(text)) {
          this.flagElement(node.parentElement, 'urgency', text);
          break;
        }
      }
    }
  }

  /** Find countdown timers and flag them */
  private findFakeCountdowns() {
    // Look for elements with timer-like content
    const candidates = document.querySelectorAll(
      '[class*="timer"], [class*="countdown"], [class*="clock"], [class*="expire"]'
    );

    candidates.forEach((el) => {
      if (!(el as HTMLElement).dataset.parasiteFlagged) {
        this.flagElement(el as HTMLElement, 'countdown');
      }
    });
  }

  /** Find manipulative emotional language in headlines */
  private findManipulativeLanguage() {
    const headings = document.querySelectorAll('h1, h2, h3, [class*="title"], [class*="headline"]');
    const manipulativePatterns = [
      /shocking|outrage|unbelievable|you won't believe/i,
      /충격|경악|믿을 수 없는|놀라운 반전/,
    ];

    headings.forEach((heading) => {
      const text = heading.textContent?.trim() || '';
      for (const pattern of manipulativePatterns) {
        if (pattern.test(text)) {
          this.flagElement(heading as HTMLElement, 'emotional');
          break;
        }
      }
    });
  }

  /** Visually flag a manipulative element */
  private flagElement(
    el: HTMLElement | null,
    type: 'urgency' | 'countdown' | 'emotional',
    matchedText?: string,
  ) {
    if (!el || el.dataset.parasiteFlagged) return;
    el.dataset.parasiteFlagged = 'true';

    const labels: Record<string, string> = {
      urgency: '🦠 조작: 인위적 긴급감',
      countdown: '🦠 조작: 가짜 카운트다운',
      emotional: '🦠 조작: 감정 자극 표현',
    };

    // Add visual flag
    el.style.position = 'relative';
    const flag = document.createElement('span');
    flag.className = 'parasite-flag';
    flag.setAttribute('data-parasite-type', type);
    flag.textContent = labels[type];
    el.appendChild(flag);

    // Whisper once per type
    if (type === 'urgency' && matchedText) {
      this.whisper.show({
        type: 'predator',
        text: `다크패턴 감지: "${matchedText}" — 이건 조작이야.`,
        duration: 5000,
      });
    }
  }

  destroy() {
    this.mutationObserver?.disconnect();
  }
}
