
export enum AudioSource {
  None,
  Microphone,
  File,
}

export enum Theme {
    Nebula = 'Nebula',
    Sunfire = 'Sunfire',
    Forest = 'Forest',
    Oceanic = 'Oceanic',
    Monochrome = 'Monochrome',
}

export interface NeogenesisProps {
  isAudioReactive: boolean;
  theme: Theme;
  particleSize: number;
  bassSensitivity: number;
  trebleSensitivity: number;
  noiseStrength: number;
  rotationSpeed: number;
  fieldOfView: number;
  bloomStrength: number;
  recursionDepth: number;
  // --- Nuevas propiedades para el control separado ---
  showFractal: boolean;
  fractalWireframe: boolean;
  particleDistributionRadius: number;
  // --- Propiedades para el material y estructura del fractal ---
  fractalLayerSpacing: number;
  fractalMetalness: number;
  fractalRoughness: number;
  // --- Propiedades para la animación de ruido del wireframe ---
  fractalWaveAmplitude: number;
  fractalWaveSmoothing: number;
  // --- Propiedad para la cámara cinematográfica ---
  cinematicCamera: boolean;
}