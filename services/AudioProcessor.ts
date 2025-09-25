
export class AudioProcessor {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private source: AudioNode | null = null;
  public frequencyData: Uint8Array;
  private gainNode: GainNode;
  public isInitialized: boolean = false;

  constructor(fftSize: number = 512) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.analyser);
  }

  private resumeContext() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public connectFile(audioElement: HTMLAudioElement) {
    this.resumeContext();
    if (this.source) {
        // Only disconnect if it's not the same element source
        if (!(this.source instanceof MediaElementAudioSourceNode) || this.source.mediaElement !== audioElement) {
            this.source.disconnect();
            this.source = this.audioContext.createMediaElementSource(audioElement);
            this.source.connect(this.gainNode);
        }
    } else {
        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.gainNode);
    }
    this.analyser.connect(this.audioContext.destination);
    this.isInitialized = true;
  }

  public async connectMicrophone() {
    this.resumeContext();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (this.source) {
        this.source.disconnect();
      }
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.gainNode);
      // Do not connect analyser to destination to avoid feedback
      this.isInitialized = true;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access was denied. Please allow microphone access in your browser settings.');
    }
  }

  public updateFrequencyData(): Uint8Array {
    if (this.isInitialized) {
        this.analyser.getByteFrequencyData(this.frequencyData);
    } else {
        this.frequencyData.fill(0);
    }
    return this.frequencyData;
  }

  public getFrequencyBinCount(): number {
    return this.analyser.frequencyBinCount;
  }
}
