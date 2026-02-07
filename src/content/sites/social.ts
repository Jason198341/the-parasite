/**
 * Social Media Parasite
 * - Hides engagement metrics (likes, followers, retweets)
 * - Infinite scroll breaker
 * - Time awareness in feed
 */
import { Observer } from '../observer';
import { Whisper } from '../whisper';
import { Mutator } from '../mutator';

export class SocialParasite {
  private observer: Observer;
  private whisper: Whisper;
  private scrollCount = 0;
  private metricsHidden = false;
  private scrollBreakInterval = 30; // Every 30 scrolls

  constructor(observer: Observer, whisper: Whisper, _mutator: Mutator) {
    this.observer = observer;
    this.whisper = whisper;
    this.init();
  }

  private init() {
    // Load preferences
    chrome.storage.local.get(['parasite_social_hideMetrics'], (result) => {
      this.metricsHidden = result.parasite_social_hideMetrics ?? false;
      if (this.metricsHidden) this.hideMetrics();
    });

    // Infinite scroll breaker
    this.installScrollBreaker();

    // Inject controls
    this.injectControls();

    // Initial whisper
    setTimeout(() => {
      this.whisper.show({
        type: 'awareness',
        text: '소셜 미디어 진입. 무한스크롤 감시 중.',
        duration: 3000,
      });
    }, 1000);
  }

  /** Count scrolls and break the trance periodically */
  private installScrollBreaker() {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        this.scrollCount++;

        if (this.scrollCount > 0 && this.scrollCount % this.scrollBreakInterval === 0) {
          this.breakScroll();
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /** Interrupt infinite scroll with a moment of awareness */
  private breakScroll() {
    const minutes = this.observer.getMinutes();

    // Create a scroll barrier
    const barrier = document.createElement('div');
    barrier.className = 'parasite-scroll-barrier';
    barrier.innerHTML = `
      <div class="parasite-scroll-barrier__content">
        <span class="parasite-scroll-barrier__icon">🦠</span>
        <p>${minutes}분째 스크롤 중. ${this.scrollCount}번 스크롤함.</p>
        <p>여기서 뭘 찾고 있어?</p>
        <button class="parasite-scroll-barrier__btn">의식적으로 계속하기</button>
      </div>
    `;

    // Insert at current scroll position
    const feedContainer = this.findFeedContainer();
    if (feedContainer) {
      const children = Array.from(feedContainer.children);
      const insertIndex = Math.min(children.length - 1, Math.max(0, children.length - 3));
      if (children[insertIndex]) {
        feedContainer.insertBefore(barrier, children[insertIndex]);
      }
    } else {
      document.body.appendChild(barrier);
    }

    const btn = barrier.querySelector('.parasite-scroll-barrier__btn');
    btn?.addEventListener('click', () => {
      barrier.classList.add('parasite-scroll-barrier--dismissed');
      setTimeout(() => barrier.remove(), 500);
    });
  }

  /** Hide engagement metrics (likes, retweets, followers) */
  hideMetrics() {
    this.metricsHidden = true;
    chrome.storage.local.set({ parasite_social_hideMetrics: true });

    const style = document.getElementById('parasite-social-metrics') || document.createElement('style');
    style.id = 'parasite-social-metrics';

    // Platform-specific selectors for engagement counts
    style.textContent = `
      /* Twitter/X */
      [data-testid="like"] span,
      [data-testid="retweet"] span,
      [data-testid="reply"] span,
      [href*="/followers"] span,
      [href*="/following"] span,
      /* Instagram */
      span[class*="x1lliihq"] > span,
      a[href*="/liked_by/"],
      /* Reddit */
      [id*="vote-arrows"] span,
      .score,
      /* Facebook */
      span[class*="pcp91wgn"],
      /* General patterns */
      [class*="like-count"],
      [class*="LikeCount"],
      [class*="share-count"],
      [class*="ShareCount"],
      [class*="view-count"],
      [class*="ViewCount"],
      [class*="comment-count"],
      [class*="CommentCount"],
      [class*="follower"],
      [class*="Follower"] {
        visibility: hidden !important;
        width: 0 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  /** Show metrics again */
  showMetrics() {
    this.metricsHidden = false;
    chrome.storage.local.set({ parasite_social_hideMetrics: false });
    document.getElementById('parasite-social-metrics')?.remove();
  }

  toggleMetrics() {
    if (this.metricsHidden) {
      this.showMetrics();
      this.whisper.show({
        type: 'insight',
        text: '숫자 복원. 다시 숫자에 휘둘릴 준비 됐어?',
        duration: 3000,
      });
    } else {
      this.hideMetrics();
      this.whisper.show({
        type: 'insight',
        text: '좋아요 숫자 숨김. 이제 내용만 보자.',
        duration: 3000,
      });
    }
  }

  /** Try to find the main feed container */
  private findFeedContainer(): HTMLElement | null {
    const selectors = [
      '[data-testid="primaryColumn"]', // Twitter
      'main [role="feed"]',            // General
      '.feed-container',
      '#siteTable',                     // Reddit old
      '[class*="feed"]',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el) return el;
    }
    return null;
  }

  /** Inject control button */
  private injectControls() {
    const btn = document.createElement('button');
    btn.id = 'parasite-social-toggle';
    btn.className = 'parasite-yt-control'; // Reuse style
    btn.textContent = '🦠';
    btn.title = 'Parasite: 좋아요 숫자 숨기기 토글';
    btn.addEventListener('click', () => this.toggleMetrics());
    document.body.appendChild(btn);
  }
}
