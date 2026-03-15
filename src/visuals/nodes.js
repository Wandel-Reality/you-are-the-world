import * as THREE from "three";
import { CONFIG } from "../utils/config.js";

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class NodeField {
  constructor(scene) {
    this.scene = scene;

    this.nodes = [];
    this.visibleNodeCount = 0;
    this.revealProgress = 0;

    this.audio = {
      bass: 0,
      mids: 0,
      highs: 0,
      level: 0,
      peak: 0,
    };

    this.bassBlink = 0;

    this.nodeGroup = new THREE.Group();
    this.lineGroup = new THREE.Group();
    this.organicGroup = new THREE.Group();

    this.scene.add(this.lineGroup);
    this.scene.add(this.organicGroup);
    this.scene.add(this.nodeGroup);

    this.createNodes();
  }

  createNodes() {
    for (let i = 0; i < CONFIG.nodes.count; i++) {
      const baseRadius = CONFIG.nodes.baseRadius * randomRange(0.8, 1.8);

      const geometry = new THREE.CircleGeometry(baseRadius, 24);
      const baseColor =
        Math.random() > 0.82 ? CONFIG.colors.nodeBright : CONFIG.colors.node;

      const material = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0,
      });

      const mesh = new THREE.Mesh(geometry, material);

      const x = randomRange(
        -CONFIG.world.width / 2 + 5,
        CONFIG.world.width / 2 - 5,
      );
      const y = randomRange(
        -CONFIG.world.height / 2 + 5,
        CONFIG.world.height / 2 - 5,
      );

      mesh.position.set(x, y, 0);

      const node = {
        mesh,
        baseRadius,
        baseColor: new THREE.Color(baseColor),
        touchedColor: new THREE.Color(CONFIG.colors.nodeTouched),

        baseX: x,
        baseY: y,
        driftSeedX: Math.random() * 1000,
        driftSeedY: Math.random() * 1000,

        revealed: false,
        state: 0,
        pulse: 0,
        lastTouchTime: -999,

        organicRotation: (Math.random() - 0.5) * Math.PI,
        organicTiltSeed: Math.random() * 1000,
        activationGlow: 0,
        deathEligible: Math.random() < 0.6,
        deathBurst: 0,
        visualOffset: new THREE.Vector3(0, 0, 0),

        organic: this.createOrganicVisual(baseRadius),
      };

      this.organicGroup.add(node.organic.group);
      this.nodes.push(node);
      this.nodeGroup.add(mesh);
    }
  }

  /*createOrganicVisual(baseRadius) {
    const group = new THREE.Group();
    group.visible = false;

    const shellGeometry = new THREE.RingGeometry(
      baseRadius * 1.8,
      baseRadius * 2.7,
      28,
    );
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.nodeTouched,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    group.add(shell);

    const filaments = [];
    for (let i = 0; i < CONFIG.organic.filamentCount; i++) {
      const material = new THREE.LineBasicMaterial({
        color: CONFIG.colors.nodeTouched,
        transparent: true,
        opacity: 0,
      });

      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);

      const line = new THREE.Line(geometry, material);
      group.add(line);

      filaments.push({
        line,
        angleSeed: (i / CONFIG.organic.filamentCount) * Math.PI * 2,
        randomSeed: Math.random() * 1000,
      });
    }

    return {
      group,
      shell,
      filaments,
    };
  }*/

  createOrganicVisual(baseRadius) {
    const group = new THREE.Group();
    group.visible = false;

    const cocoonWidth = baseRadius * (5.0 + Math.random() * 1.8);
    const cocoonHeight = baseRadius * (3.2 + Math.random() * 1.6);

    // Irregular cocoon outline
    const outlineCount = 56;
    const outlinePoints = [];

    for (let i = 0; i <= outlineCount; i++) {
      const t = (i / outlineCount) * Math.PI * 2;

      const noise1 = Math.sin(t * 2 + Math.random() * 0.2) * 0.1;
      const noise2 = Math.sin(t * 5 + Math.random() * 0.2) * 0.05;
      const noise3 = Math.cos(t * 3 + Math.random() * 0.2) * 0.06;

      const rX = cocoonWidth * (0.48 + noise1 + noise2);
      const rY = cocoonHeight * (0.48 + noise1 + noise3);

      const x = Math.cos(t) * rX;
      const y = Math.sin(t) * rY;

      outlinePoints.push(new THREE.Vector3(x, y, 0));
    }

    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(
      outlinePoints,
    );
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: CONFIG.colors.nodeBright,
      transparent: true,
      opacity: 0,
    });
    const outline = new THREE.LineLoop(outlineGeometry, outlineMaterial);
    group.add(outline);

    // Second overlapping outline to simulate thicker stroke
    const OUTLINE_INNER_SCALE = 0.96;
    const outline2 = new THREE.LineLoop(
      outlineGeometry,
      outlineMaterial.clone(),
    );
    outline2.scale.setScalar(OUTLINE_INNER_SCALE);
    group.add(outline2);

    // Small central core
    const coreGeo = new THREE.CircleGeometry(baseRadius * 0.42, 18);
    const coreMat = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.nodeBright,
      transparent: true,
      opacity: 0,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Small hotspot near one side
    const hotspotGeo = new THREE.CircleGeometry(baseRadius * 0.22, 16);
    const hotspotMat = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.nodeTouched,
      transparent: true,
      opacity: 0,
    });
    const hotspot = new THREE.Mesh(hotspotGeo, hotspotMat);
    hotspot.position.set(cocoonWidth * 0.18, baseRadius * 0.05, 0.03);
    group.add(hotspot);

    // Growing tentacles from center toward boundary
    const strands = [];
    for (let i = 0; i < 28; i++) {
      const material = new THREE.LineBasicMaterial({
        color: CONFIG.colors.nodeBright,
        transparent: true,
        opacity: 0,
      });

      const geometry = new THREE.BufferGeometry();
      const line = new THREE.Line(geometry, material);
      group.add(line);

      const angle = Math.random() * Math.PI * 2;
      const targetRadiusScale = 0.55 + Math.random() * 0.35;

      // 30% of strands get a duplicate line for visible thickness
      const THICK_STRAND_CHANCE = 0.3;
      const thickStrand = Math.random() < THICK_STRAND_CHANCE;
      let strandLine2 = null;
      if (thickStrand) {
        strandLine2 = new THREE.Line(new THREE.BufferGeometry(), material.clone());
        group.add(strandLine2);
      }

      strands.push({
        line,
        line2: strandLine2,
        thick: thickStrand,
        seed: Math.random() * 1000,
        angle,
        targetRadiusScale,
        bend: -0.25 + Math.random() * 0.5,
        thicknessBias: Math.random(),
      });
    }

    // Paint splash blobs instead of circles
    const splashes = [];
    for (let i = 0; i < 5; i++) {
      const splashShape = new THREE.Shape();
      const splashSize = baseRadius * (0.22 + Math.random() * 0.18);

      const pts = 10;
      for (let p = 0; p <= pts; p++) {
        const t = (p / pts) * Math.PI * 2;
        const rr =
          splashSize *
          (0.75 +
            Math.sin(t * 3 + Math.random()) * 0.18 +
            Math.random() * 0.22);

        const x = Math.cos(t) * rr;
        const y = Math.sin(t) * rr;

        if (p === 0) splashShape.moveTo(x, y);
        else splashShape.lineTo(x, y);
      }

      const geo = new THREE.ShapeGeometry(splashShape);
      const mat = new THREE.MeshBasicMaterial({
        color: CONFIG.colors.nodeTouched,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      splashes.push({
        mesh,
        seed: Math.random() * 1000,
        xNorm: -0.18 + Math.random() * 0.5,
        yNorm: -0.26 + Math.random() * 0.52,
        rot: Math.random() * Math.PI * 2,
      });
    }

    // Wispy external filaments
    const filaments = [];
    for (let i = 0; i < 6; i++) {
      const material = new THREE.LineBasicMaterial({
        color: CONFIG.colors.nodeBright,
        transparent: true,
        opacity: 0,
      });

      const geometry = new THREE.BufferGeometry();
      const line = new THREE.Line(geometry, material);
      group.add(line);

      // 30% of filaments get a duplicate line for visual thickness
      const THICK_FILAMENT_CHANCE = 0.3;
      const thick = Math.random() < THICK_FILAMENT_CHANCE;
      let line2 = null;
      if (thick) {
        line2 = new THREE.Line(new THREE.BufferGeometry(), material.clone());
        group.add(line2);
      }

      filaments.push({
        line,
        line2,
        thick,
        seed: Math.random() * 1000,
        offset: i / 5,
      });
    }

    return {
      group,
      outline,
      outline2,
      core,
      hotspot,
      strands,
      splashes,
      filaments,
      cocoonWidth,
      cocoonHeight,
    };
  }

  update(delta, elapsedTime, audio) {
    this.audio = audio || this.audio;

    // Bass-hit blink: spike on transient peaks, decay back to 0
    const BLINK_STRENGTH = 4.0;
    const BLINK_DECAY = 4.0;
    const peak = this.audio.peak || 0;
    this.bassBlink = Math.min(1, this.bassBlink + peak * BLINK_STRENGTH);
    this.bassBlink = Math.max(0, this.bassBlink - delta * BLINK_DECAY);

    this.updateReveal(delta);
    this.updateDrift(elapsedTime);
    this.updateRepulsion(delta);
    this.updateVisualState(delta, elapsedTime);
    this.rebuildConnectors(elapsedTime);
  }

  updateRepulsion(delta) {
    for (const node of this.nodes) {
      node.visualOffset.multiplyScalar(0.88);
    }

    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      if (a.state <= 0) continue;

      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        if (b.state <= 0) continue;

        const ax = a.mesh.position.x + a.visualOffset.x;
        const ay = a.mesh.position.y + a.visualOffset.y;
        const bx = b.mesh.position.x + b.visualOffset.x;
        const by = b.mesh.position.y + b.visualOffset.y;

        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

        const minDist = (a.organic.cocoonWidth + b.organic.cocoonWidth) * 0.18;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          const push = overlap * 0.5 * 0.12;

          a.visualOffset.x -= nx * push;
          a.visualOffset.y -= ny * push;

          b.visualOffset.x += nx * push;
          b.visualOffset.y += ny * push;
        }
      }
    }
  }

  updateReveal(delta) {
    this.revealProgress += CONFIG.nodes.revealSpeed * delta;

    const targetVisibleCount = Math.floor(
      Math.min(1, this.revealProgress) * this.nodes.length,
    );

    while (this.visibleNodeCount < targetVisibleCount) {
      this.nodes[this.visibleNodeCount].revealed = true;
      this.visibleNodeCount++;
    }

    for (const node of this.nodes) {
      const targetOpacity = node.revealed ? 0.95 : 0;
      node.mesh.material.opacity +=
        (targetOpacity - node.mesh.material.opacity) * 0.08;
    }
  }

  updateDrift(elapsedTime) {
    const bass = this.audio?.bass || 0;

    const normalBassBoost = 1 + bass * 3.0;
    const organicBassBoost = 1 + bass * 9.0;

    for (const node of this.nodes) {
      if (!node.revealed) continue;

      const bassBoost = node.state > 0 ? organicBassBoost : normalBassBoost;

      const dx =
        Math.sin(elapsedTime * 0.9 + node.driftSeedX) *
        CONFIG.nodes.driftAmount *
        bassBoost;

      const dy =
        Math.cos(elapsedTime * 0.7 + node.driftSeedY) *
        CONFIG.nodes.driftAmount *
        bassBoost;

      node.mesh.position.x = node.baseX + dx;
      node.mesh.position.y = node.baseY + dy;
    }
  }

  updateVisualState(delta, elapsedTime) {
    for (const node of this.nodes) {
      if (!node.revealed) continue;

      node.pulse = Math.max(
        0,
        node.pulse - delta * CONFIG.nodes.pulseDecaySpeed,
      );

      // Inactivity death for eligible organic nodes
      const INACTIVITY_DEATH_TIME = 10.0;
      const BURST_DURATION = 0.5;

      if (node.state > 0 && node.deathEligible && node.deathBurst <= 0) {
        if (elapsedTime - node.lastTouchTime > INACTIVITY_DEATH_TIME) {
          node.deathBurst = 1.0;
        }
      }

      if (node.deathBurst > 0) {
        node.deathBurst = Math.max(0, node.deathBurst - delta / BURST_DURATION);
        if (node.deathBurst <= 0) {
          node.state = 0;
          node.pulse = 0;
        }
      }

      if (node.state <= 0) {
        const shimmer = Math.sin(elapsedTime * 2.0 + node.driftSeedX) * 0.03;

        node.mesh.scale.set(1, 1, 1);
        node.mesh.material.color
          .copy(node.baseColor)
          .lerp(node.touchedColor, Math.max(0, shimmer));
        const dataTargetOpacity = 0.95 - this.bassBlink * 0.55;
        node.mesh.material.opacity +=
          (dataTargetOpacity - node.mesh.material.opacity) * 0.35;
      } else {
        // Once transformed, the base node should stop dominating
        node.mesh.scale.set(1, 1, 1);
        node.mesh.material.color.copy(node.baseColor);
      }

      this.updateOrganicNode(node, elapsedTime);
    }
  }

  /*updateOrganicNode(node, elapsedTime) {
    const organic = node.organic;
    const isActive = node.state > 0 || node.pulse > 0.05;

    organic.group.visible = isActive;
    if (!isActive) return;

    organic.group.position.copy(node.mesh.position);
    organic.group.position.z = 0.5;

    const life = Math.min(1, node.state * 0.28 + node.pulse * 0.5);
    const organicScale = 0.65 + node.state * 0.12 + node.pulse * 0.25;
    organic.group.scale.setScalar(organicScale);

    organic.shell.material.opacity = CONFIG.organic.shellOpacity * life;
    organic.shell.rotation.z = elapsedTime * 0.12 + node.driftSeedX;

    for (const filament of organic.filaments) {
      const a =
        filament.angleSeed +
        Math.sin(elapsedTime * 0.7 + filament.randomSeed) * 0.25;
      const r1 = node.baseRadius * 1.2;
      const r2 =
        node.baseRadius * (2.2 + node.state * 0.25 + node.pulse * 0.45);
      const bend = CONFIG.organic.wobbleAmount + node.pulse * 0.08;

      const p0 = new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, 0);

      const p1 = new THREE.Vector3(
        Math.cos(a + bend) * (r1 + r2) * 0.55,
        Math.sin(a - bend) * (r1 + r2) * 0.55,
        0,
      );

      const p2 = new THREE.Vector3(Math.cos(a) * r2, Math.sin(a) * r2, 0);

      filament.line.geometry.setFromPoints([p0, p1, p2]);
      filament.line.material.opacity =
        CONFIG.organic.filamentOpacity * life * (0.7 + node.pulse * 0.25);
    }
  }*/

  updateOrganicNode(node, elapsedTime) {
    const organic = node.organic;
    const active = node.state > 0 || node.pulse > 0.05 || node.deathBurst > 0;

    organic.group.visible = active;
    if (!active) return;

    node.activationGlow = Math.max(0, node.activationGlow - 0.015);

    organic.group.position.copy(node.mesh.position).add(node.visualOffset);
    organic.group.position.z = 0.5;

    const life = Math.min(1, node.state * 0.3 + node.pulse * 0.7);
    const growth = Math.min(1, node.state * 0.42 + node.pulse * 0.65);

    organic.group.rotation.z =
      node.organicRotation +
      Math.sin(elapsedTime * 0.22 + node.organicTiltSeed) * 0.08;

    organic.group.scale.setScalar(0.9 + node.state * 0.05 + node.pulse * 0.06);

    // Fade base node strongly after transformation
    node.mesh.scale.set(1, 1, 1);
    const nodeOpacityTarget = 0.035;
    node.mesh.material.opacity +=
      (nodeOpacityTarget - node.mesh.material.opacity) * 0.12;

    // Cocoon outline (outline2 mirrors opacity for double-stroke thickness)
    organic.outline.material.opacity = 0.14 + life * 0.24;
    organic.outline2.material.opacity = organic.outline.material.opacity;

    // Core and hotspot with activation glow burst
    const glowBoost = node.activationGlow * 0.55;

    organic.core.material.opacity = 0.1 + life * 0.14 + glowBoost * 0.25;
    const highs = this.audio?.highs || 0;

    organic.hotspot.material.opacity =
      0.08 + life * 0.18 + glowBoost * 0.35 + highs * 0.25;

    organic.core.scale.setScalar(
      1 +
        Math.sin(elapsedTime * 1.4 + node.driftSeedX) * 0.02 +
        glowBoost * 0.22,
    );

    organic.hotspot.scale.setScalar(
      1 +
        Math.sin(elapsedTime * 1.9 + node.driftSeedY) * 0.03 +
        glowBoost * 0.3,
    );

    // Paint splashes
    for (const splash of organic.splashes) {
      splash.mesh.position.set(
        splash.xNorm * organic.cocoonWidth +
          Math.sin(elapsedTime * 0.35 + splash.seed) * 0.06,
        splash.yNorm * organic.cocoonHeight +
          Math.cos(elapsedTime * 0.42 + splash.seed) * 0.06,
        0.02,
      );

      splash.mesh.rotation.z =
        splash.rot + Math.sin(elapsedTime * 0.3 + splash.seed) * 0.08;

      splash.mesh.material.opacity = 0.03 + life * 0.1;
    }

    // More strands become active with repeated interaction
    const activeStrandCount = Math.min(
      organic.strands.length,
      8 + node.state * 3,
    );

    for (let i = 0; i < organic.strands.length; i++) {
      const strand = organic.strands[i];
      const isActiveStrand = i < activeStrandCount;

      if (!isActiveStrand) {
        strand.line.material.opacity = 0;
        continue;
      }

      const angle = strand.angle;
      const maxRx = organic.cocoonWidth * 0.48 * strand.targetRadiusScale;
      const maxRy = organic.cocoonHeight * 0.48 * strand.targetRadiusScale;

      // Start slightly extended, then grow faster
      const reach = 0.28 + growth * 0.72;

      const endX = Math.cos(angle) * maxRx * reach;
      const endY = Math.sin(angle) * maxRy * reach;

      const c1x =
        Math.cos(angle + strand.bend) * maxRx * 0.35 * reach +
        Math.sin(elapsedTime * 0.7 + strand.seed) * 0.12;

      const c1y =
        Math.sin(angle - strand.bend) * maxRy * 0.35 * reach +
        Math.cos(elapsedTime * 0.8 + strand.seed) * 0.12;

      const c2x =
        Math.cos(angle + strand.bend * 0.5) * maxRx * 0.72 * reach +
        Math.cos(elapsedTime * 0.6 + strand.seed) * 0.08;

      const c2y =
        Math.sin(angle - strand.bend * 0.5) * maxRy * 0.72 * reach +
        Math.sin(elapsedTime * 0.75 + strand.seed) * 0.08;

      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, 0, 0.01),
        new THREE.Vector3(c1x, c1y, 0.01),
        new THREE.Vector3(c2x, c2y, 0.01),
        new THREE.Vector3(endX, endY, 0.01),
      );

      const strandPoints = curve.getPoints(16);
      strand.line.geometry.setFromPoints(strandPoints);
      const peak = this.audio?.peak || 0;

      strand.line.material.opacity =
        0.05 +
        life * (0.1 + strand.thicknessBias * 0.07) +
        glowBoost * 0.1 +
        peak * 0.25;

      if (strand.thick && strand.line2) {
        strand.line2.geometry.setFromPoints(strandPoints);
        strand.line2.material.opacity = strand.line.material.opacity;
      }
    }

    // Outer wispy filaments
    for (const filament of organic.filaments) {
      const startX = organic.cocoonWidth * 0.22;
      const startY = (filament.offset - 0.5) * organic.cocoonHeight * 0.42;

      const len = organic.cocoonWidth * (0.22 + filament.offset * 0.12);

      const c1x = startX + len * 0.35;
      const c1y =
        startY +
        Math.sin(elapsedTime * 0.6 + filament.seed) *
          organic.cocoonHeight *
          0.07;

      const endX = startX + len;
      const endY =
        startY +
        Math.cos(elapsedTime * 0.5 + filament.seed) *
          organic.cocoonHeight *
          0.1;

      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(startX, startY, 0.01),
        new THREE.Vector3(c1x, c1y, 0.01),
        new THREE.Vector3(endX, endY, 0.01),
      );

      const filamentPoints = curve.getPoints(12);
      filament.line.geometry.setFromPoints(filamentPoints);
      filament.line.material.opacity = 0.05 + life * 0.12;

      // Thick filaments: duplicate geometry on line2 for double-stroke
      if (filament.thick && filament.line2) {
        filament.line2.geometry.setFromPoints(filamentPoints);
        filament.line2.material.opacity = filament.line.material.opacity;
      }
    }

    // Death burst: expand scale and fade everything to zero
    if (node.deathBurst > 0) {
      const fo = node.deathBurst;
      organic.group.scale.setScalar(1.0 + (1.0 - fo) * 2.0);
      organic.outline.material.opacity *= fo;
      organic.outline2.material.opacity *= fo;
      organic.core.material.opacity *= fo;
      organic.hotspot.material.opacity *= fo;
      for (const s of organic.strands) {
        s.line.material.opacity *= fo;
        if (s.thick && s.line2) s.line2.material.opacity *= fo;
      }
      for (const s of organic.splashes) s.mesh.material.opacity *= fo;
      for (const f of organic.filaments) {
        f.line.material.opacity *= fo;
        if (f.thick && f.line2) f.line2.material.opacity *= fo;
      }
    }
  }

  interactWithCircle(circlePosition, circleRadius, elapsedTime) {
    const effectiveRadius = circleRadius * CONFIG.nodes.touchRadiusBoost;
    const revealRadius = CONFIG.nodes.localRevealRadius;

    for (const node of this.nodes) {
      const dx = circlePosition.x - node.mesh.position.x;
      const dy = circlePosition.y - node.mesh.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!node.revealed && dist < revealRadius) {
        node.revealed = true;
        this.visibleNodeCount = Math.max(
          this.visibleNodeCount,
          this.nodes.filter((n) => n.revealed).length,
        );
      }

      if (!node.revealed) continue;

      const collisionThreshold = effectiveRadius + node.baseRadius;

      if (dist < collisionThreshold) {
        const timeSinceLastTouch = elapsedTime - node.lastTouchTime;

        if (timeSinceLastTouch > CONFIG.nodes.touchCooldown) {
          node.state += 1;
          node.pulse = Math.min(node.pulse + 1.73, 3.0);
          node.activationGlow = 1.0;
          node.lastTouchTime = elapsedTime;
        }
      }
    }
  }

  rebuildConnectors(elapsedTime) {
    const mids = this.audio?.mids || 0;

    while (this.lineGroup.children.length > 0) {
      const line = this.lineGroup.children.pop();
      line.geometry.dispose();
      line.material.dispose();
    }

    for (let i = 0; i < this.visibleNodeCount; i++) {
      const a = this.nodes[i];
      if (!a.revealed) continue;

      for (let j = i + 1; j < this.visibleNodeCount; j++) {
        const b = this.nodes[j];
        if (!b.revealed) continue;

        const dist = a.mesh.position.distanceTo(b.mesh.position);
        if (dist > CONFIG.nodes.lineDistance) continue;

        const mid = a.mesh.position
          .clone()
          .add(b.mesh.position)
          .multiplyScalar(0.5);
        const dir = b.mesh.position.clone().sub(a.mesh.position);
        const normal = new THREE.Vector3(-dir.y, dir.x, 0).normalize();

        const curveOffset =
          dist *
          CONFIG.connectors.curveStrength *
          Math.sin(elapsedTime * 0.35 + a.driftSeedX + b.driftSeedY);

        const control = mid.add(normal.multiplyScalar(curveOffset));

        const curve = new THREE.QuadraticBezierCurve3(
          a.mesh.position.clone(),
          control,
          b.mesh.position.clone(),
        );

        const points = curve.getPoints(CONFIG.connectors.subdivisions);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const baseOpacity =
          (1 - dist / CONFIG.nodes.lineDistance) * CONFIG.nodes.lineOpacity;

        const energyBoost = Math.min(
          0.25,
          (a.pulse + b.pulse) * 0.06 + (a.state + b.state) * 0.015,
        );

        const audioBoost = mids * 0.35;

        const isDataConnector = a.state <= 0 && b.state <= 0;
        const blinkDip = isDataConnector ? this.bassBlink * 0.55 : 0;

        const material = new THREE.LineBasicMaterial({
          color: CONFIG.colors.line,
          transparent: true,
          opacity: Math.max(0, baseOpacity + energyBoost + audioBoost - blinkDip),
        });

        const line = new THREE.Line(geometry, material);
        this.lineGroup.add(line);
      }
    }
  }
}
