import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { CONFIG } from "../utils/config.js";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

// MediaPipe pose landmark indices
const LM = {
  LEFT_SHOULDER:  11,
  RIGHT_SHOULDER: 12,
  LEFT_WRIST:     15,
  RIGHT_WRIST:    16,
};

export class MediaPipeTracking {
  constructor() {
    this._ready = false;
    this._fallback = false;
    this._video = null;
    this._landmarker = null;
    this._lastVideoTime = -1;

    // Smoothed state for the single center-zone performer.
    // All values are normalised [0,1] camera space, X mirrored if mirrorX=true.
    this._initialized = false;
    this._torsoX = 0.5;
    this._torsoY = 0.4;
    this._handX  = 0.5;
    this._handY  = 0.5;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async init() {
    try {
      // Lower resolution reduces MediaPipe processing time and lag.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360, facingMode: "user" },
      });

      // Best-effort: lock focus/exposure/white-balance to prevent tracking
      // instability caused by autofocus blurring or exposure flicker.
      try {
        const track = stream.getVideoTracks()[0];
        const caps  = track.getCapabilities?.() ?? {};
        const constraints = {};
        if (caps.focusMode?.includes("manual"))        constraints.focusMode = "manual";
        if (caps.exposureMode?.includes("manual"))     constraints.exposureMode = "manual";
        if (caps.whiteBalanceMode?.includes("manual")) constraints.whiteBalanceMode = "manual";
        if (Object.keys(constraints).length) await track.applyConstraints(constraints);
      } catch (_) { /* unsupported on this camera/browser — safe to ignore */ }

      this._video = document.createElement("video");
      this._video.srcObject = stream;
      this._video.autoplay = true;
      this._video.playsInline = true;
      this._video.style.cssText =
        "position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;";
      document.body.appendChild(this._video);

      await new Promise((resolve) => {
        this._video.onloadedmetadata = () => {
          this._video.play();
          resolve();
        };
      });

      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      this._landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: CONFIG.performers.count,
        minPoseDetectionConfidence: 0.4,
        minPosePresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });

      this._ready = true;
    } catch (err) {
      console.warn(
        "[MediaPipeTracking] Failed to initialise — using fallback position.",
        err,
      );
      this._fallback = true;
    }
  }

  // Call once per animation frame.
  update() {
    if (!this._ready || this._fallback) return;
    if (!this._video || this._video.readyState < 2) return;

    const now = performance.now();
    if (this._video.currentTime === this._lastVideoTime) return;
    this._lastVideoTime = this._video.currentTime;

    const result = this._landmarker.detectForVideo(this._video, now);
    this._processPoses(result.landmarks ?? []);
  }

  // Returns the world-space { x, y } position for the single circle.
  //
  // The control hand is mapped directly to world coordinates:
  //   camera centre (0.5, 0.5) → world (0, 0)
  //   hand moves right/left/up/down → circle moves in the same direction
  //
  // The torso is tracked internally for hand-selection but does NOT contribute
  // to the circle position, avoiding the compounding-offset "drop" that occurs
  // when the torso's world-Y and the below-shoulder hand offset add together.
  getCenterPosition() {
    if (!this._initialized) return { x: 0, y: 0 };

    const { handHorizontalScale, handVerticalScale } = CONFIG.performers;

    return {
      x:  (this._handX - 0.5) * handHorizontalScale,
      y: -(this._handY - 0.5) * handVerticalScale,
    };
  }

  get ready()    { return this._ready; }
  get fallback() { return this._fallback; }

  // ─── Private ─────────────────────────────────────────────────────────────

  _processPoses(poseList) {
    const { mirrorX, torsoAlpha, handAlpha,
            centerZoneMin, centerZoneMax } = CONFIG.performers;

    // Find the pose whose shoulder midpoint falls within the center zone.
    // If multiple candidates qualify, take the one closest to frame centre.
    let best             = null;
    let bestDistToCenter = Infinity;

    for (const landmarks of poseList) {
      const lShoulder = landmarks[LM.LEFT_SHOULDER];
      const rShoulder = landmarks[LM.RIGHT_SHOULDER];
      const lWrist    = landmarks[LM.LEFT_WRIST];
      const rWrist    = landmarks[LM.RIGHT_WRIST];
      if (!lShoulder || !rShoulder || !lWrist || !rWrist) continue;

      const rawShoulderX = (lShoulder.x + rShoulder.x) * 0.5;
      const shoulderX    = mirrorX ? 1 - rawShoulderX : rawShoulderX;

      // Only consider poses inside the center zone.
      if (shoulderX < centerZoneMin || shoulderX >= centerZoneMax) continue;

      const dist = Math.abs(shoulderX - 0.5);
      if (dist >= bestDistToCenter) continue;
      bestDistToCenter = dist;

      const shoulderY = (lShoulder.y + rShoulder.y) * 0.5;
      const lWristX   = mirrorX ? 1 - lWrist.x : lWrist.x;
      const rWristX   = mirrorX ? 1 - rWrist.x : rWrist.x;

      // Control hand = the wrist with the larger displacement from the torso.
      // Rationale: the free/control hand is typically extended away from the
      // body; the mic hand stays near the face, roughly above the shoulder
      // midpoint, giving it a smaller torso-relative displacement.
      const lDist = Math.hypot(lWristX - shoulderX, lWrist.y - shoulderY);
      const rDist = Math.hypot(rWristX - shoulderX, rWrist.y - shoulderY);
      const handX = lDist >= rDist ? lWristX : rWristX;
      const handY = lDist >= rDist ? lWrist.y : rWrist.y;

      best = { shoulderX, shoulderY, handX, handY };
    }

    // No center performer this frame — hold the last known position.
    if (!best) return;

    if (!this._initialized) {
      // Snap to first detection to avoid drift-in artefact.
      this._torsoX      = best.shoulderX;
      this._torsoY      = best.shoulderY;
      this._handX       = best.handX;
      this._handY       = best.handY;
      this._initialized = true;
      return;
    }

    // Separate EMA per signal: torso is smoothed heavily for stability;
    // hand is smoothed more lightly to preserve expressive responsiveness.
    this._torsoX = torsoAlpha * best.shoulderX + (1 - torsoAlpha) * this._torsoX;
    this._torsoY = torsoAlpha * best.shoulderY + (1 - torsoAlpha) * this._torsoY;
    this._handX  = handAlpha  * best.handX     + (1 - handAlpha)  * this._handX;
    this._handY  = handAlpha  * best.handY     + (1 - handAlpha)  * this._handY;
  }
}
