/**
 * YouTube Parasite
 * - Tracks consecutive video watches (binge detection)
 * - Grayscale thumbnails (remove visual dopamine)
 * - Autoplay interruption
 * - Watch time awareness
 */
import { Observer } from '../observer';
import { Whisper } from '../whisper';
import { Mutator } from '../mutator';

export class YouTubeParasite {
  private observer: Observer;
  private whisper: Whisper;
  private videoCount = 0;
  private lastVideoId = '';
  private grayscaleEnabled = false;
  private checkInterval: number | null = null;

  constructor(observer: Observer, whisper: Whisper, _mutator: Mutator) {
    this.observer = observer;
    this.whisper = whisper;
    this.init();
  }

  private init() {
    // Load saved preferences
    chrome.storage.local.get(['parasite_yt_grayscale'], (result) => {
      this.grayscaleEnabled = result.parasite_yt_grayscale ?? false;
      if (this.grayscaleEnabled) this.applyGrayscale();
    });

    // Track video changes
    this.checkInterval = window.setInterval(() => this.checkVideoChange(), 2000);

    // Initial whisper
    setTimeout(() => {
      this.whisper.show({
        type: 'awareness',
        text: '유튜브 진입. 기생충 활성화.',
        duration: 3000,
      });
    }, 1500);

    // Inject control panel
    this.injectControls();

    // Watch for navigation (YouTube is SPA)
    this.watchNavigation();
  }

  private checkVideoChange() {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('v');

    if (videoId && videoId !== this.lastVideoId) {
      this.lastVideoId = videoId;
      this.videoCount++;

      if (this.videoCount >= 3) {
        this.whisper.show({
          type: 'warning',
          text: `연속 ${this.videoCount}번째 영상. 자동재생에 끌려가고 있어.`,
          duration: 8000,
          action: {
            label: '잠깐 멈추기',
            onClick: () => this.pauseVideo(),
          },
        });
      }

      if (this.videoCount >= 5) {
        this.whisper.show({
          type: 'predator',
          text: `${this.videoCount}개째. 알고리즘이 너를 놓지 않고 있어. 의식적으로 선택했어?`,
          duration: 10000,
        });
      }
    }
  }

  /** Apply grayscale filter to all thumbnails */
  applyGrayscale() {
    this.grayscaleEnabled = true;
    chrome.storage.local.set({ parasite_yt_grayscale: true });

    const style = document.getElementById('parasite-yt-grayscale') || document.createElement('style');
    style.id = 'parasite-yt-grayscale';
    style.textContent = `
      ytd-thumbnail img,
      ytd-playlist-thumbnail img,
      yt-image img,
      #thumbnail img {
        filter: grayscale(100%) !important;
        transition: filter 0.3s ease !important;
      }
      ytd-thumbnail:hover img,
      ytd-playlist-thumbnail:hover img {
        filter: grayscale(30%) !important;
      }
    `;
    document.head.appendChild(style);
  }

  /** Remove grayscale filter */
  removeGrayscale() {
    this.grayscaleEnabled = false;
    chrome.storage.local.set({ parasite_yt_grayscale: false });
    document.getElementById('parasite-yt-grayscale')?.remove();
  }

  /** Toggle grayscale */
  toggleGrayscale() {
    if (this.grayscaleEnabled) {
      this.removeGrayscale();
      this.whisper.show({
        type: 'insight',
        text: '컬러 복원. 썸네일이 다시 자극적일 거야.',
        duration: 3000,
      });
    } else {
      this.applyGrayscale();
      this.whisper.show({
        type: 'insight',
        text: '흑백 모드. 이제 제목으로만 판단해봐.',
        duration: 3000,
      });
    }
  }

  /** Pause the current video */
  private pauseVideo() {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video) video.pause();
  }

  /** Inject floating control button for YouTube-specific features */
  private injectControls() {
    const btn = document.createElement('button');
    btn.id = 'parasite-yt-toggle';
    btn.className = 'parasite-yt-control';
    btn.textContent = '🦠';
    btn.title = 'Parasite: 썸네일 흑백 토글';
    btn.addEventListener('click', () => this.toggleGrayscale());
    document.body.appendChild(btn);
  }

  /** YouTube is a SPA — watch for URL changes */
  private watchNavigation() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (this.grayscaleEnabled) {
          // Re-apply grayscale after navigation
          setTimeout(() => this.applyGrayscale(), 500);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
