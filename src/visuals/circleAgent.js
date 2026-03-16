import * as THREE from "three";
import { CONFIG } from "../utils/config.js";

export class CircleAgent {
  constructor(scene, ringColor = CONFIG.colors.circleGlow) {
    this.scene = scene;

    this.group = new THREE.Group();

    const glowGeometry = new THREE.CircleGeometry(CONFIG.circle.glowRadius, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.circleGlow,
      transparent: true,
      opacity: 0.12,
    });
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);

    const coreGeometry = new THREE.CircleGeometry(CONFIG.circle.radius, 64);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.circleCore,
      transparent: true,
      opacity: 0.96,
    });
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);

    const ringGeometry = new THREE.RingGeometry(
      CONFIG.circle.radius + 0.25,
      CONFIG.circle.radius + 0.7,
      64,
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);

    this.glow.renderOrder = 1;
    this.core.renderOrder = 1;
    this.ring.renderOrder = 1;

    this.group.add(this.glow);
    this.group.add(this.core);
    this.group.add(this.ring);

    this.group.position.set(0, 0, 2);

    this.currentPosition = new THREE.Vector3(0, 0, 2);
    this.targetPosition = new THREE.Vector3(0, 0, 2);

    this.scene.add(this.group);
  }

  update(targetWorld, elapsedTime) {
    this.targetPosition.set(targetWorld.x, targetWorld.y, 2);

    this.currentPosition.lerp(this.targetPosition, CONFIG.circle.followLerp);
    this.group.position.copy(this.currentPosition);

    const pulse = 1 + Math.sin(elapsedTime * 1.6) * 0.02;
    this.glow.scale.setScalar(pulse);
    this.ring.material.opacity = 0.38 + Math.sin(elapsedTime * 2.2) * 0.07;
    this.glow.material.opacity = 0.1 + Math.sin(elapsedTime * 1.4) * 0.025;
  }
}
