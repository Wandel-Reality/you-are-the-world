import { extractAudioFeatures } from "./audioFeatures.js";

export class AudioInput {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.gainNode = null;

    this.audioElement = null;

    this.frequencyData = null;
    this.timeDomainData = null;

    this.features = {
      bass: 0,
      mids: 0,
      highs: 0,
      level: 0,
      smoothedLevel: 0,
      peak: 0,
    };

    this.isReady = false;
    this.isPlaying = false;
    this.mode = null; // "file" later "live"
  }

  async initFromFile(fileUrl) {
    this.mode = "file";

    this.audioContext = new window.AudioContext();

    this.audioElement = new Audio(fileUrl);
    this.audioElement.crossOrigin = "anonymous";
    this.audioElement.loop = true;

    this.sourceNode = this.audioContext.createMediaElementSource(
      this.audioElement,
    );

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.75;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.fftSize);

    this.isReady = true;
  }

  async resumeAndPlay() {
    if (!this.isReady) return;

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    await this.audioElement.play();
    this.isPlaying = true;
  }

  pause() {
    if (!this.audioElement) return;
    this.audioElement.pause();
    this.isPlaying = false;
  }

  togglePlayPause() {
    if (!this.audioElement) return;

    if (this.audioElement.paused) {
      this.resumeAndPlay();
    } else {
      this.pause();
    }
  }

  update() {
    if (!this.isReady || !this.analyser) return this.features;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    this.features = extractAudioFeatures({
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      analyser: this.analyser,
      previous: this.features,
    });

    return this.features;
  }

  getFeatures() {
    return this.features;
  }
}
