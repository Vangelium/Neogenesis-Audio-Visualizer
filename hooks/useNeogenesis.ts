import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { NeogenesisProps, Theme } from '../types';
import { AudioProcessor } from '../services/AudioProcessor';
import { createNeogenesisFractal } from '../services/fractalGenerator';

const themeColors: Record<Theme, { color1: THREE.Color, color2: THREE.Color, color3: THREE.Color, emissive: THREE.Color }> = {
    [Theme.Nebula]: { color1: new THREE.Color(0xda00ff), color2: new THREE.Color(0x0099ff), color3: new THREE.Color(0xff00b3), emissive: new THREE.Color(0x8a2be2) },
    [Theme.Sunfire]: { color1: new THREE.Color(0xff4800), color2: new THREE.Color(0xffdd00), color3: new THREE.Color(0xff8c00), emissive: new THREE.Color(0xff4500) },
    [Theme.Forest]: { color1: new THREE.Color(0x00ff00), color2: new THREE.Color(0x008000), color3: new THREE.Color(0x9acd32), emissive: new THREE.Color(0x228b22) },
    [Theme.Oceanic]: { color1: new THREE.Color(0x00ffff), color2: new THREE.Color(0x0000ff), color3: new THREE.Color(0x4682b4), emissive: new THREE.Color(0x1e90ff) },
    [Theme.Monochrome]: { color1: new THREE.Color(0xffffff), color2: new THREE.Color(0x888888), color3: new THREE.Color(0xcccccc), emissive: new THREE.Color(0xaaaaaa) },
};

const PARTICLE_COUNT = 20000;

// Helper to generate particle positions in a sphere
const createParticleGeometry = (count: number, radius: number): THREE.BufferGeometry => {
    const positions = new Float32Array(count * 3);
    const initialPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = radius * Math.cbrt(Math.random());

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    initialPositions.set(positions);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('initialPosition', new THREE.BufferAttribute(initialPositions, 3));
    return geometry;
};


export const useNeogenesis = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  props: NeogenesisProps,
  audioProcessorRef: React.RefObject<AudioProcessor | null>
) => {
  const isInitialized = useRef(false);
  const propsRef = useRef(props);
  
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const fractalGroupRef = useRef<THREE.Group | null>(null);
  const originalFractalPositionsRef = useRef<Float32Array | null>(null);
  const lastWireframeStateRef = useRef<boolean>(props.fractalWireframe);
  const userInteractingRef = useRef(false);
  
  // Keep the ref updated with the latest props
  useEffect(() => {
    propsRef.current = props;
  }, [props]);


  useEffect(() => {
    if (!canvasRef.current || isInitialized.current) return;
    const canvas = canvasRef.current;

    // --- Core Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(props.fieldOfView, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 100;

    // --- Cinematic Camera Interaction Listeners ---
    const onInteractionStart = () => { userInteractingRef.current = true; };
    const onInteractionEnd = () => { userInteractingRef.current = false; };
    controls.addEventListener('start', onInteractionStart);
    controls.addEventListener('end', onInteractionEnd);


    // --- Post-processing (Bloom) ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    
    // --- 1. Fractal Planet Setup (Triple Layer) ---
    const fractalMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: themeColors[props.theme].emissive,
        emissiveIntensity: 1.0,
        metalness: props.fractalMetalness,
        roughness: props.fractalRoughness,
        wireframe: props.fractalWireframe,
    });
    const baseGeo = new THREE.IcosahedronGeometry(4, 1);
    const fractalGeo = createNeogenesisFractal(baseGeo, props.recursionDepth);
    originalFractalPositionsRef.current = fractalGeo.attributes.position.array.slice();
    
    fractalGroupRef.current = new THREE.Group();
    const initialSpacing = props.fractalLayerSpacing;
    const scales = [1.0, initialSpacing, initialSpacing * initialSpacing];
    for(let i = 0; i < 3; i++) {
        const mesh = new THREE.Mesh(fractalGeo, fractalMaterial);
        mesh.scale.set(scales[i], scales[i], scales[i]);
        fractalGroupRef.current.add(mesh);
    }
    scene.add(fractalGroupRef.current);

    // --- 2. Particle Galaxy Setup ---
    const particleGeo = createParticleGeometry(PARTICLE_COUNT, props.particleDistributionRadius);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const randoms = new Float32Array(PARTICLE_COUNT);
    const theme = themeColors[props.theme];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const color = Math.random() > 0.5 ? theme.color1 : theme.color2;
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
        sizes[i] = Math.random() * 1.5 + 0.5;
        randoms[i] = Math.random();
    }
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeo.setAttribute('random', new THREE.BufferAttribute(randoms, 1));

    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            pointTexture: { value: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png') },
            uTime: { value: 0.0 }, uBass: { value: 0.0 }, uTreble: { value: 0.0 },
            uNoiseStrength: { value: props.noiseStrength }, uParticleSize: { value: props.particleSize },
            uColor1: { value: theme.color1 }, uColor2: { value: theme.color2 }, uColor3: { value: theme.color3 },
        },
        vertexShader: `
            attribute float size; attribute float random; attribute vec3 initialPosition;
            uniform float uTime; uniform float uBass; uniform float uTreble; uniform float uNoiseStrength; uniform float uParticleSize;
            varying vec3 vColor;
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
                i = mod289(i);
                vec4 p = permute(permute(permute( i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m; return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
            void main() {
                vColor = color; vec3 pos = initialPosition;
                float noise = snoise(pos * 0.1 + uTime * 0.05) * uNoiseStrength;
                float displacement = (uTreble * 2.0 + noise) * (1.0 + random);
                pos += normalize(pos) * displacement;
                vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectionPosition = projectionMatrix * viewPosition;
                gl_Position = projectionPosition;
                gl_PointSize = size * uParticleSize * (1.0 + uTreble) * (300.0 / -viewPosition.z);
            }`,
        fragmentShader: `
            uniform sampler2D pointTexture; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3; uniform float uBass;
            varying vec3 vColor;
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                vec3 finalColor = mix(uColor1, uColor2, vColor.r);
                finalColor = mix(finalColor, uColor3, uBass);
                gl_FragColor = vec4(finalColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
                if (dist > 0.5) { discard; }
            }`,
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true,
    });
    particleSystemRef.current = new THREE.Points(particleGeo, particleMaterial);
    scene.add(particleSystemRef.current);
    
    isInitialized.current = true;
    const clock = new THREE.Clock();
    const targetPos = new THREE.Vector3();
    const currentPos = new THREE.Vector3();

    // --- Main Animation Loop ---
    const animate = () => {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();
        const audio = audioProcessorRef.current;
        const currentProps = propsRef.current;
        
        // --- Audio Data Processing ---
        let freqData: Uint8Array | null = null;
        let bassAvg = 0, trebleAvg = 0;
        if (audio && currentProps.isAudioReactive) {
            freqData = audio.updateFrequencyData();
            const binCount = audio.getFrequencyBinCount();
            const bassFreqs = freqData.slice(0, binCount * 0.1);
            const trebleFreqs = freqData.slice(binCount * 0.4, binCount * 0.8);
            bassAvg = bassFreqs.reduce((s, v) => s + v, 0) / (bassFreqs.length * 255);
            trebleAvg = trebleFreqs.reduce((s, v) => s + v, 0) / (trebleFreqs.length * 255);
        }
        
        const smoothedBass = THREE.MathUtils.lerp(particleMaterial.uniforms.uBass.value, bassAvg * currentProps.bassSensitivity, 0.1);
        const smoothedTreble = THREE.MathUtils.lerp(particleMaterial.uniforms.uTreble.value, trebleAvg * currentProps.trebleSensitivity, 0.1);
        
        // --- 1. Update Fractal Planet ---
        if (fractalGroupRef.current) {
            fractalGroupRef.current.visible = currentProps.showFractal;
            const isWireframe = currentProps.fractalWireframe;

            // Since all meshes share geometry and material, we only need to access them once
            const firstMesh = fractalGroupRef.current.children[0] as THREE.Mesh;
            const fractalGeo = firstMesh.geometry;
            const fractalMat = firstMesh.material as THREE.MeshStandardMaterial;
            
            fractalMat.wireframe = isWireframe;
            fractalMat.metalness = currentProps.fractalMetalness;
            fractalMat.roughness = currentProps.fractalRoughness;
            fractalMat.emissiveIntensity = THREE.MathUtils.lerp(fractalMat.emissiveIntensity, 1.0 + smoothedBass * 4.0, 0.1);
            fractalMat.emissive.lerp(themeColors[currentProps.theme].emissive, 0.1);

            if (isWireframe) {
                // --- White Noise vertex displacement animation ---
                const posAttr = fractalGeo.attributes.position as THREE.BufferAttribute;
                const normals = fractalGeo.attributes.normal as THREE.BufferAttribute;
                const originalPositions = originalFractalPositionsRef.current;

                if (audio && freqData && originalPositions && normals) {
                    const binCount = freqData.length;
                    for (let i = 0; i < posAttr.count; i++) {
                        const freqIndex = i % binCount;
                        const freqValue = freqData[freqIndex] / 255.0;
                        const displacement = freqValue * currentProps.fractalWaveAmplitude * (1.0 + smoothedBass);

                        const ox = originalPositions[i * 3];
                        const oy = originalPositions[i * 3 + 1];
                        const oz = originalPositions[i * 3 + 2];
                        
                        const nx = normals.getX(i);
                        const ny = normals.getY(i);
                        const nz = normals.getZ(i);
                        
                        targetPos.set(ox + nx * displacement, oy + ny * displacement, oz + nz * displacement);
                        currentPos.fromBufferAttribute(posAttr, i);
                        currentPos.lerp(targetPos, currentProps.fractalWaveSmoothing);

                        posAttr.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);
                    }
                    posAttr.needsUpdate = true;
                }
            } else if (lastWireframeStateRef.current) {
                // --- Restore geometry when switching FROM wireframe ---
                const posAttr = fractalGeo.attributes.position as THREE.BufferAttribute;
                const originalPositions = originalFractalPositionsRef.current;
                if (originalPositions) {
                    posAttr.array.set(originalPositions);
                    posAttr.needsUpdate = true;
                }
            }

            const spacing = currentProps.fractalLayerSpacing;
            const baseScales = [1.0, spacing, spacing * spacing];

            fractalGroupRef.current.children.forEach((mesh, i) => {
                const typedMesh = mesh as THREE.Mesh;
                const speedFactor = (i + 1) * 0.6;
                typedMesh.rotation.y += 0.0005 * currentProps.rotationSpeed * speedFactor;
                typedMesh.rotation.x -= 0.0003 * currentProps.rotationSpeed * speedFactor;
                
                const baseScale = baseScales[i];
                // If not in wireframe mode, apply scale pulse
                if (!isWireframe) {
                    const scalePulse = 1.0 + smoothedBass * 0.1;
                    typedMesh.scale.set(baseScale * scalePulse, baseScale * scalePulse, baseScale * scalePulse);
                } else {
                    // Reset scale in wireframe mode
                    typedMesh.scale.set(baseScale, baseScale, baseScale);
                }
            });

            lastWireframeStateRef.current = isWireframe;
        }

        // --- 2. Update Particle Galaxy ---
        if (particleSystemRef.current) {
            particleSystemRef.current.rotation.y = elapsedTime * currentProps.rotationSpeed * 0.05;
            
            const mat = particleSystemRef.current.material as THREE.ShaderMaterial;
            mat.uniforms.uTime.value = elapsedTime;
            mat.uniforms.uBass.value = smoothedBass;
            mat.uniforms.uTreble.value = smoothedTreble;
            mat.uniforms.uNoiseStrength.value = currentProps.noiseStrength;
            mat.uniforms.uParticleSize.value = currentProps.particleSize;
            
            const currentTheme = themeColors[currentProps.theme];
            mat.uniforms.uColor1.value.lerp(currentTheme.color1, 0.1);
            mat.uniforms.uColor2.value.lerp(currentTheme.color2, 0.1);
            mat.uniforms.uColor3.value.lerp(currentTheme.color3, 0.1);
        }

        // --- Update Camera, Controls, and Renderer ---
        if (currentProps.cinematicCamera && !userInteractingRef.current) {
            const time = elapsedTime * 0.1;
            const distance = 18 + Math.sin(time * 0.5) * 6;
            camera.position.x = Math.cos(time) * distance;
            camera.position.z = Math.sin(time) * distance;
            camera.position.y = 4 + Math.sin(time * 0.7) * 4;
            camera.lookAt(scene.position);
        }

        camera.fov = THREE.MathUtils.lerp(camera.fov, currentProps.fieldOfView, 0.1);
        camera.updateProjectionMatrix();
        bloomPass.strength = currentProps.bloomStrength;
        controls.update();
        composer.render();
    };
    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Cleanup and Prop-based Updates ---
    const fractalGroup = fractalGroupRef.current;
    const particleSystem = particleSystemRef.current;
    const pMat = particleSystem?.material as THREE.ShaderMaterial;
    
    return () => {
        window.removeEventListener('resize', handleResize);
        controls.removeEventListener('start', onInteractionStart);
        controls.removeEventListener('end', onInteractionEnd);
        particleSystem?.geometry.dispose();
        pMat?.dispose();
        
        if (fractalGroup && fractalGroup.children.length > 0) {
            const firstMesh = fractalGroup.children[0] as THREE.Mesh;
            // Geometry and material are shared, so we only need to dispose them once
            firstMesh.geometry.dispose();
            (firstMesh.material as THREE.Material).dispose();
        }

        renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // --- Effects to dynamically update geometries based on props ---
  useEffect(() => {
    if (!fractalGroupRef.current || fractalGroupRef.current.children.length === 0) return;
    
    const baseGeo = new THREE.IcosahedronGeometry(4, 1);
    const newFractalGeo = createNeogenesisFractal(baseGeo, props.recursionDepth);
    const oldGeo = (fractalGroupRef.current.children[0] as THREE.Mesh).geometry;
    
    originalFractalPositionsRef.current = newFractalGeo.attributes.position.array.slice();

    fractalGroupRef.current.children.forEach(child => {
        (child as THREE.Mesh).geometry = newFractalGeo;
    });

    oldGeo.dispose();

  }, [props.recursionDepth]);
  
  useEffect(() => {
    if (!particleSystemRef.current) return;
    const newParticleGeo = createParticleGeometry(PARTICLE_COUNT, props.particleDistributionRadius);
    
    // We need to copy over the other attributes
    const oldGeo = particleSystemRef.current.geometry;
    newParticleGeo.setAttribute('color', oldGeo.getAttribute('color'));
    newParticleGeo.setAttribute('size', oldGeo.getAttribute('size'));
    newParticleGeo.setAttribute('random', oldGeo.getAttribute('random'));
    
    particleSystemRef.current.geometry.dispose();
    particleSystemRef.current.geometry = newParticleGeo;
  }, [props.particleDistributionRadius]);
};