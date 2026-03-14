import * as THREE from "three";
import "./style.css";

import { setupScene } from "./scene/setupScene.js";
import { NodeField } from "./visuals/nodes.js";
import { MouseController } from "./controls/mouseController.js";
import { CircleAgent } from "./visuals/circleAgent.js";
import { CONFIG } from "./utils/config.js";
import { AudioInput } from "./audio/audioInput.js";
import { ParticleField } from "./visuals/particleField.js";

const { scene, camera, renderer } = setupScene();

const timer = new THREE.Timer();
const nodeField = new NodeField(scene);
const mouseController = new MouseController(camera);
const circleAgent = new CircleAgent(scene);
const particleField = new ParticleField(scene);

const audioInput = new AudioInput();

await audioInput.initFromFile("/audio/test-track.mp3");

window.addEventListener(
  "click",
  async () => {
    await audioInput.resumeAndPlay();
  },
  { once: true },
);

window.addEventListener("keydown", async (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    audioInput.togglePlayPause();
  }
});

let lastAudioLogTime = 0;

function animate() {
  requestAnimationFrame(animate);

  timer.update();

  const delta = timer.getDelta();
  const elapsedTime = timer.getElapsed();

  const targetWorld = mouseController.update();
  const audio = audioInput.update();
  particleField.update(elapsedTime, audio);
  nodeField.update(delta, elapsedTime, audio);
  circleAgent.update(targetWorld, elapsedTime);

  nodeField.interactWithCircle(
    circleAgent.group.position,
    CONFIG.circle.radius,
    elapsedTime,
  );

  if (elapsedTime - lastAudioLogTime > 0.5) {
    console.log({
      level: audio.level.toFixed(2),
      bass: audio.bass.toFixed(2),
      mids: audio.mids.toFixed(2),
      highs: audio.highs.toFixed(2),
      peak: audio.peak.toFixed(2),
    });
    lastAudioLogTime = elapsedTime;
  }

  renderer.render(scene, camera);
}

animate();
