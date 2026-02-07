/**
 * Layer 1: Observer
 * Tracks time, scroll depth, and behavioral patterns.
 * Silent. Invisible. Always watching.
 */

interface ObserverData {
  site: string;
  minutes: number;
  scrollDepth: number;
  tabSwitches: number;
  startedAt: number;
}

type ThresholdCallback = (data: ObserverData) => void;

export class Observer {
  private data: ObserverData;
  private thresholdCallbacks: ThresholdCallback[] = [];
  private intervalId: number | null = null;
  private lastWhisperMinute = 0;
  // Whisper at these minute marks (1, 3 are for testing — remove later)
  private whisperThresholds = [1, 3, 5, 10, 20, 30, 45, 60, 90, 120, 180];

  constructor() {
    this.data = {
      site: window.location.hostname,
      minutes: 0,
      scrollDepth: 0,
      tabSwitches: 0,
      startedAt: Date.now(),
    };
  }

  start() {
    // Track time every 15 seconds
    this.intervalId = window.setInterval(() => {
      this.data.minutes = Math.floor((Date.now() - this.data.startedAt) / 60_000);
      this.checkThresholds();
      this.reportToBackground();
    }, 15_000);

    // Also report immediately
    this.reportToBackground();

    // Track scroll depth
    window.addEventListener('scroll', this.trackScroll, { passive: true });

    // Track tab visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.data.tabSwitches++;
      }
    });
  }

  onThreshold(cb: ThresholdCallback) {
    this.thresholdCallbacks.push(cb);
  }

  getMinutes(): number {
    return this.data.minutes;
  }

  getData(): ObserverData {
    return { ...this.data };
  }

  destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    window.removeEventListener('scroll', this.trackScroll);
  }

  private trackScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      this.data.scrollDepth = Math.max(
        this.data.scrollDepth,
        Math.round((scrollTop / docHeight) * 100)
      );
    }
  };

  private checkThresholds() {
    const nextThreshold = this.whisperThresholds.find(
      (t) => t > this.lastWhisperMinute && this.data.minutes >= t
    );
    if (nextThreshold) {
      this.lastWhisperMinute = nextThreshold;
      this.thresholdCallbacks.forEach((cb) => cb(this.data));
    }
  }

  private reportToBackground() {
    chrome.runtime.sendMessage({
      type: 'OBSERVER_UPDATE',
      data: this.data,
    }).catch(() => {});
  }
}
