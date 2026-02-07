/**
 * Shopping Site Parasite
 * - Detects and flags fake urgency / dark patterns
 * - "You saw this X days ago" memory
 * - Cool-down whisper before checkout
 */
import { Observer } from '../observer';
import { Whisper } from '../whisper';
import { Mutator } from '../mutator';

interface ViewedProduct {
  url: string;
  title: string;
  firstSeen: number;
  viewCount: number;
}

export class ShoppingParasite {
  private observer: Observer;
  private whisper: Whisper;
  private mutator: Mutator;

  constructor(observer: Observer, whisper: Whisper, mutator: Mutator) {
    this.observer = observer;
    this.whisper = whisper;
    this.mutator = mutator;
    this.init();
  }

  private init() {
    // Run extra dark pattern hunting
    this.mutator.huntDarkPatterns();

    // Track product views
    this.trackProductView();

    // Watch for checkout pages
    this.watchCheckout();

    // Initial whisper
    setTimeout(() => {
      this.whisper.show({
        type: 'awareness',
        text: '쇼핑 사이트 감지. 다크패턴 스캔 중...',
        duration: 3000,
      });
    }, 1000);

    // Re-scan after dynamic loads
    setTimeout(() => this.mutator.huntDarkPatterns(), 3000);
    setTimeout(() => this.mutator.huntDarkPatterns(), 6000);
  }

  /** Remember products you've viewed */
  private trackProductView() {
    const url = window.location.href;
    const title = document.title;

    chrome.storage.local.get(['parasite_viewed_products'], (result) => {
      const products: Record<string, ViewedProduct> = result.parasite_viewed_products || {};
      const key = this.normalizeUrl(url);

      if (products[key]) {
        // Seen before!
        products[key].viewCount++;
        const daysSince = Math.floor(
          (Date.now() - products[key].firstSeen) / (1000 * 60 * 60 * 24)
        );

        if (daysSince > 0) {
          this.whisper.show({
            type: 'insight',
            text: `이거 ${daysSince}일 전에도 봤어. ${products[key].viewCount}번째 방문. 사고 싶은 게 아니라 지루한 거 아냐?`,
            duration: 8000,
          });
        }
      } else {
        products[key] = {
          url,
          title,
          firstSeen: Date.now(),
          viewCount: 1,
        };
      }

      chrome.storage.local.set({ parasite_viewed_products: products });
    });
  }

  /** Detect checkout / cart pages and add a cooling whisper */
  private watchCheckout() {
    const checkoutPatterns = [
      /cart|checkout|payment|order|결제|장바구니|주문/i,
    ];

    const url = window.location.href.toLowerCase();
    const isCheckout = checkoutPatterns.some((p) => p.test(url));

    if (isCheckout) {
      const minutes = this.observer.getMinutes();
      this.whisper.show({
        type: 'warning',
        text: minutes < 5
          ? '결제 페이지. 들어온 지 5분도 안 됐어. 충동구매 패턴.'
          : '결제 전 10초만. 이게 진짜 필요한 거야?',
        duration: 10000,
      });
    }
  }

  /** Normalize URL for comparison (strip tracking params) */
  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      // Remove common tracking params
      ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid', 'gclid'].forEach(
        (p) => u.searchParams.delete(p)
      );
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }
}
