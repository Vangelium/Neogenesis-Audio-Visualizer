// src/services/fractalGenerator.ts
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Crea la geometría fractal de Neogenesis.
 * @param baseGeometry La forma inicial (ej. un Icosaedro).
 * @param recursionDepth El nivel de detalle del fractal.
 * @returns Una BufferGeometry única, unificada y lista para usar.
 */
export function createNeogenesisFractal(baseGeometry: THREE.BufferGeometry, recursionDepth: number): THREE.BufferGeometry {
  
  // Extraemos los vértices de la geometría base para trabajar con ellos.
  const basePositions = baseGeometry.attributes.position;
  const initialTriangles: THREE.Triangle[] = [];
  
  // Si la geometría está indexada, la descomponemos en triángulos.
  if (baseGeometry.index) {
    for (let i = 0; i < baseGeometry.index.count; i += 3) {
      const v1 = new THREE.Vector3().fromBufferAttribute(basePositions, baseGeometry.index.getX(i));
      const v2 = new THREE.Vector3().fromBufferAttribute(basePositions, baseGeometry.index.getX(i + 1));
      const v3 = new THREE.Vector3().fromBufferAttribute(basePositions, baseGeometry.index.getX(i + 2));
      initialTriangles.push(new THREE.Triangle(v1, v2, v3));
    }
  } else {
    // Si no está indexada, los vértices van de 3 en 3.
    for (let i = 0; i < basePositions.count; i += 3) {
      const v1 = new THREE.Vector3().fromBufferAttribute(basePositions, i);
      const v2 = new THREE.Vector3().fromBufferAttribute(basePositions, i + 1);
      const v3 = new THREE.Vector3().fromBufferAttribute(basePositions, i + 2);
      initialTriangles.push(new THREE.Triangle(v1, v2, v3));
    }
  }

  if (recursionDepth === 0) {
    return baseGeometry;
  }

  let finalTriangles = initialTriangles;

  // -- PASO 2: SUBDIVISIÓN RECURSIVA --
  for (let i = 0; i < recursionDepth; i++) {
    const newTriangles: THREE.Triangle[] = [];
    finalTriangles.forEach(tri => {
      const m12 = new THREE.Vector3().addVectors(tri.a, tri.b).multiplyScalar(0.5);
      const m23 = new THREE.Vector3().addVectors(tri.b, tri.c).multiplyScalar(0.5);
      const m31 = new THREE.Vector3().addVectors(tri.c, tri.a).multiplyScalar(0.5);

      // Proyectar los puntos medios para mantener la forma esférica
      const radius = tri.a.length();
      m12.normalize().multiplyScalar(radius);
      m23.normalize().multiplyScalar(radius);
      m31.normalize().multiplyScalar(radius);
      
      newTriangles.push(new THREE.Triangle(tri.a, m12, m31));
      newTriangles.push(new THREE.Triangle(tri.b, m23, m12));
      newTriangles.push(new THREE.Triangle(tri.c, m31, m23));
    });
    finalTriangles = newTriangles;
  }

  // -- PASO 3: RECOLECCIÓN --
  const geometries: THREE.BufferGeometry[] = [];
  finalTriangles.forEach(tri => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([
      tri.a.x, tri.a.y, tri.a.z,
      tri.b.x, tri.b.y, tri.b.z,
      tri.c.x, tri.c.y, tri.c.z,
    ], 3));
    geometries.push(geo);
  });

  if (geometries.length === 0) {
    return new THREE.BufferGeometry(); // Devuelve una geometría vacía si no hay nada que procesar
  }

  // -- PASO 4: UNIFICACIÓN Y SOLDADURA --
  // Primero, fusionamos todas las geometrías pequeñas en una sola.
  const mergedGeo = BufferGeometryUtils.mergeGeometries(geometries);
  if (!mergedGeo) {
    return new THREE.BufferGeometry();
  }
  // Luego, "soldamos" los vértices duplicados para crear una malla continua.
  const finalGeo = BufferGeometryUtils.mergeVertices(mergedGeo);
  // Finalmente, calculamos las normales para que la iluminación funcione correctamente.
  finalGeo.computeVertexNormals();

  return finalGeo;
}
