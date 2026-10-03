import * as THREE from 'three';

/** All models use Y up, are centered, and use 1 scene unit = 100 mm. */
export type ProductKind = 'vase' | 'planter' | 'tray' | 'stand' | 'organizer' | 'lamp';

export const PRODUCT_DIMENSIONS_MM: Record<ProductKind, [number, number, number]> = {
  vase: [158, 240, 158],
  planter: [160, 125, 160],
  tray: [268, 30, 170],
  stand: [150, 140, 157],
  organizer: [221, 115, 106],
  lamp: [210, 230, 210],
};

type ShellOptions = {
  height: number;
  radius: (t: number) => number;
  wall: number;
  floor?: number;
  ribs?: number;
  ribDepth?: number;
  twist?: number;
  scaleX?: number;
  scaleZ?: number;
  exponent?: number;
  rings?: number;
  segments?: number;
  /** A shade, for example, has openings at both ends. */
  openBottom?: boolean;
};

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Smoothly interpolate a radius profile without overshooting its knots. */
function profile(knots: [number, number][]): (t: number) => number {
  return (t) => {
    const clamped = THREE.MathUtils.clamp(t, 0, 1);
    for (let i = 1; i < knots.length; i++) {
      if (clamped <= knots[i][0]) {
        const previous = knots[i - 1];
        const next = knots[i];
        const mix = smoothstep((clamped - previous[0]) / (next[0] - previous[0]));
        return THREE.MathUtils.lerp(previous[1], next[1], mix);
      }
    }
    return knots[knots.length - 1][1];
  };
}

/**
 * A closed, indexed shell. Outer surface, inner surface, rim, and floor share
 * vertices; there are no coincident seams or paper-thin, double-sided walls.
 * The hollow interior is visible from a normal three-quarter camera angle.
 */
function radialShell(options: ShellOptions): THREE.BufferGeometry {
  const {
    height, radius, wall, floor = 0.085,
    ribs = 32, ribDepth = 0.025, twist = 0,
    scaleX = 1, scaleZ = 1, exponent = 2,
    rings = 64, segments = 192, openBottom = false,
  } = options;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const innerStart = openBottom ? 0 : floor;
  const power = 2 / exponent;

  function addRing(y: number, inner: boolean) {
    const t = y / height;
    const averageRadius = radius(t) - (inner ? wall : 0);
    // Round flute crests create long satin highlights instead of sharp facets.
    // Lower inner fluting keeps the wall substantial at every valley.
    const amplitude = ribDepth * (inner ? 0.76 : 1);
    const twistAtY = t * twist;
    for (let segment = 0; segment < segments; segment++) {
      const theta = segment / segments * Math.PI * 2;
      const flute = Math.cos((theta - twistAtY) * ribs);
      const r = averageRadius + amplitude * flute;
      const cosine = Math.cos(theta);
      const sine = Math.sin(theta);
      const x = Math.sign(cosine) * Math.pow(Math.abs(cosine), power) * r * scaleX;
      const z = Math.sign(sine) * Math.pow(Math.abs(sine), power) * r * scaleZ;
      positions.push(x, y, z);
      uvs.push(segment / segments, t);
    }
  }

  for (let ring = 0; ring <= rings; ring++) addRing(ring / rings * height, false);
  const innerOffset = positions.length / 3;
  for (let ring = 0; ring <= rings; ring++) {
    addRing(innerStart + ring / rings * (height - innerStart), true);
  }

  for (let ring = 0; ring < rings; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const next = (segment + 1) % segments;
      const a = ring * segments + segment;
      const b = ring * segments + next;
      const c = (ring + 1) * segments + segment;
      const d = (ring + 1) * segments + next;
      indices.push(a, c, b, b, c, d);
      indices.push(innerOffset + a, innerOffset + b, innerOffset + c,
        innerOffset + b, innerOffset + d, innerOffset + c);
    }
  }

  const outerTop = rings * segments;
  const innerTop = innerOffset + rings * segments;
  for (let segment = 0; segment < segments; segment++) {
    const next = (segment + 1) % segments;
    indices.push(outerTop + segment, innerTop + segment, outerTop + next,
      outerTop + next, innerTop + segment, innerTop + next);
  }

  if (openBottom) {
    for (let segment = 0; segment < segments; segment++) {
      const next = (segment + 1) % segments;
      indices.push(segment, next, innerOffset + segment,
        next, innerOffset + next, innerOffset + segment);
    }
  } else {
    const outerCenter = positions.length / 3;
    positions.push(0, 0, 0);
    uvs.push(0.5, 0.5);
    const innerCenter = positions.length / 3;
    positions.push(0, floor, 0);
    uvs.push(0.5, 0.5);
    for (let segment = 0; segment < segments; segment++) {
      const next = (segment + 1) % segments;
      indices.push(segment, next, outerCenter);
      indices.push(innerOffset + next, innerOffset + segment, innerCenter);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Merge without BufferGeometryUtils or any example-module dependencies. */
function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const part of parts) {
    const position = part.getAttribute('position');
    if (!part.getAttribute('normal')) part.computeVertexNormals();
    const normal = part.getAttribute('normal');
    const uv = part.getAttribute('uv');
    const offset = positions.length / 3;
    for (let i = 0; i < position.count; i++) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i));
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    if (part.index) {
      for (let i = 0; i < part.index.count; i++) indices.push(offset + part.index.getX(i));
    } else {
      for (let i = 0; i < position.count; i++) indices.push(offset + i);
    }
    part.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  return merged;
}

function phoneStand(): THREE.BufferGeometry {
  // A filleted, continuous side profile with an angled back and a real front lip.
  const shape = new THREE.Shape();
  shape.moveTo(-0.75, 0.05);
  shape.lineTo(0.60, 0.05);
  shape.quadraticCurveTo(0.72, 0.05, 0.72, 0.17);
  shape.lineTo(0.72, 0.38);
  shape.quadraticCurveTo(0.72, 0.45, 0.65, 0.45);
  shape.lineTo(0.60, 0.45);
  shape.lineTo(0.60, 0.21);
  shape.lineTo(0.36, 0.21);
  shape.lineTo(-0.21, 1.35);
  shape.quadraticCurveTo(-0.24, 1.42, -0.32, 1.39);
  shape.lineTo(-0.42, 1.34);
  shape.quadraticCurveTo(-0.47, 1.30, -0.43, 1.22);
  shape.lineTo(0.08, 0.19);
  shape.lineTo(-0.75, 0.19);
  shape.quadraticCurveTo(-0.80, 0.19, -0.80, 0.12);
  shape.quadraticCurveTo(-0.80, 0.05, -0.75, 0.05);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1.45, bevelEnabled: true, bevelSegments: 4,
    bevelSize: 0.025, bevelThickness: 0.025, steps: 1, curveSegments: 16,
  });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-0.725, 0, 0);
  return geometry;
}

function organizer(preview = false): THREE.BufferGeometry {
  const shell = radialShell({
    height: 1.15, radius: () => 0.52, wall: 0.055, floor: 0.07,
    scaleX: 2.08, scaleZ: 1, exponent: 3.2,
    ribs: 40, ribDepth: 0.012, twist: 0, rings: preview ? 20 : 30, segments: preview ? 160 : 240,
  });
  // Two practical dividers join the inside of the closed outer cup.
  const dividerA = new THREE.BoxGeometry(0.045, 1.03, 0.94);
  dividerA.translate(-0.34, 0.585, 0);
  const dividerB = new THREE.BoxGeometry(0.045, 1.03, 0.94);
  dividerB.translate(0.34, 0.585, 0);
  return mergeGeometries([shell, dividerA, dividerB]);
}

function tableLamp(preview = false): THREE.BufferGeometry {
  const shade = radialShell({
    height: 1.0,
    radius: profile([[0, 1.015], [0.12, 1.0], [0.55, 0.80], [0.88, 0.50], [1, 0.36]]),
    wall: 0.055, ribs: 48, ribDepth: 0.035, twist: 0.20,
    openBottom: true, rings: preview ? 32 : 64, segments: preview ? 192 : 240,
  });
  shade.translate(0, 1.30, 0);
  const base = radialShell({
    height: 0.22, radius: profile([[0, 0.52], [0.5, 0.56], [1, 0.52]]),
    wall: 0.08, floor: 0.14, ribs: 40, ribDepth: 0.015,
    rings: preview ? 10 : 16, segments: 160,
  });
  const stem = new THREE.CylinderGeometry(0.10, 0.12, 1.55, 64);
  stem.translate(0, 0.92, 0);
  return mergeGeometries([shade, base, stem]);
}

/** Create a fresh geometry; callers own it and should dispose it on replacement. */
export function createProductGeometry(kind: ProductKind, preview = false): THREE.BufferGeometry {
  let geometry: THREE.BufferGeometry;
  switch (kind) {
    case 'vase':
      geometry = radialShell({
        height: 2.4,
        radius: profile([[0, 0.50], [0.13, 0.53], [0.36, 0.72], [0.64, 0.82], [0.83, 0.74], [1, 0.59]]),
        wall: 0.030, floor: 0.045, ribs: 24, ribDepth: 0.052,
        twist: 1.15, rings: preview ? 80 : 120, segments: preview ? 240 : 288,
      });
      break;
    case 'planter':
      geometry = radialShell({
        height: 1.25,
        radius: profile([[0, 0.60], [0.08, 0.62], [0.60, 0.72], [0.92, 0.77], [1, 0.76]]),
        wall: 0.08, floor: 0.12, ribs: 40, ribDepth: 0.033,
        twist: 0.23, rings: preview ? 32 : 64, segments: preview ? 160 : 240,
      });
      break;
    case 'tray':
      geometry = radialShell({
        height: 0.30,
        radius: profile([[0, 0.78], [0.14, 0.85], [0.72, 0.985], [1, 1.0]]),
        wall: 0.055, floor: 0.055, scaleX: 1.33, scaleZ: 0.84,
        ribs: 64, ribDepth: 0.009, twist: 0, rings: preview ? 16 : 32, segments: 256,
      });
      break;
    case 'stand':
      geometry = phoneStand();
      break;
    case 'organizer':
      geometry = organizer(preview);
      break;
    case 'lamp':
      geometry = tableLamp(preview);
      break;
  }
  geometry.computeBoundingBox();
  const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
