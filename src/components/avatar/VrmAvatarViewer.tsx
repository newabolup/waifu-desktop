import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AvatarExpression } from '../../types/character';
import { ttsService } from '../../services/voice/ttsService';
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Eye } from 'lucide-react';

interface VrmAvatarViewerProps {
  vrmUrl: string;
  expression?: AvatarExpression;
  isTalking?: boolean;
  className?: string;
  onLoaded?: (vrm: VRM) => void;
  onError?: (err: string) => void;
}

export const VrmAvatarViewer: React.FC<VrmAvatarViewerProps> = ({
  vrmUrl,
  expression = 'idle',
  isTalking = false,
  className = '',
  onLoaded,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentVrmRef = useRef<VRM | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const defaultCameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.25, 0));

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // References for live animation loop
  const isTalkingRef = useRef(isTalking);
  isTalkingRef.current = isTalking;

  const expressionRef = useRef(expression);
  expressionRef.current = expression;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !vrmUrl) return;

    setLoading(true);
    setLoadError(null);

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 460;

    const camera = new THREE.PerspectiveCamera(30.0, width / height, 0.1, 20.0);
    camera.position.set(0.0, 1.35, 1.35);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. OrbitControls (Zoom, Rotate, Pan)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 0.4;
    controls.maxDistance = 4.0;
    controls.target.set(0.0, 1.25, 0.0);
    controlsRef.current = controls;

    // 3. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.6);
    mainLight.position.set(1.5, 2.5, 2.0);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffd5e5, 1.0);
    fillLight.position.set(-1.5, 1.5, 1.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc084fc, 0.9);
    rimLight.position.set(0.0, 2.0, -2.0);
    scene.add(rimLight);

    // 4. VRM Loader
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let activeVrm: VRM | null = null;
    let animationFrameId: number;
    const clock = new THREE.Clock();

    // Helper to set natural idle arm position (converts T-pose to natural standing pose)
    const applyNaturalArmPose = (vrm: VRM) => {
      const humanoid = vrm.humanoid;
      if (!humanoid) return;

      const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
      const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
      const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
      const leftHand = humanoid.getNormalizedBoneNode('leftHand');
      const rightHand = humanoid.getNormalizedBoneNode('rightHand');

      if (leftUpperArm) {
        leftUpperArm.rotation.set(0.12, 0.05, -1.25); // Relax arm down against body
      }
      if (rightUpperArm) {
        rightUpperArm.rotation.set(0.12, -0.05, 1.25); // Relax arm down against body
      }
      if (leftLowerArm) {
        leftLowerArm.rotation.set(-0.15, 0.35, 0.0); // Gentle elbow inward bend
      }
      if (rightLowerArm) {
        rightLowerArm.rotation.set(-0.15, -0.35, 0.0);
      }
      if (leftHand) {
        leftHand.rotation.set(0.0, 0.0, -0.1);
      }
      if (rightHand) {
        rightHand.rotation.set(0.0, 0.0, 0.1);
      }
    };

    loader.load(
      vrmUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          setLoadError('داده‌های معتبر VRM در فایل پیدا نشد.');
          setLoading(false);
          onError?.('Invalid VRM');
          return;
        }

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        vrm.scene.rotation.y = Math.PI; // Face forward
        scene.add(vrm.scene);

        // Position camera focus directly on upper chest / face
        const headNode = vrm.humanoid?.getNormalizedBoneNode('head');
        if (headNode) {
          const headPos = new THREE.Vector3();
          headNode.getWorldPosition(headPos);
          const targetY = headPos.y - 0.06;
          controls.target.set(0.0, targetY, 0.0);
          defaultCameraTargetRef.current.set(0.0, targetY, 0.0);
          camera.position.set(0.0, targetY, 1.2);
        }

        // Apply natural resting arm pose right away
        applyNaturalArmPose(vrm);

        activeVrm = vrm;
        currentVrmRef.current = vrm;
        setLoading(false);
        onLoaded?.(vrm);
      },
      undefined,
      (err) => {
        console.error('Failed to load VRM model:', err);
        setLoadError('خطا در بارگذاری فایل VRM.');
        setLoading(false);
        onError?.(String(err));
      }
    );

    // 5. Animation and Pose Loop
    let nextBlinkTime = 2.5;
    let isBlinking = false;
    let blinkProgress = 0;

    // Smoothed pose values for natural interpolation
    const currentPose = {
      headX: 0,
      headY: 0,
      headZ: 0,
      spineX: 0,
      spineY: 0,
      leftArmZ: -1.25,
      leftArmX: 0.12,
      rightArmZ: 1.25,
      rightArmX: 0.12,
      leftElbowY: 0.35,
      rightElbowY: -0.35,
      leftElbowX: -0.15,
      rightElbowX: -0.15,
      mouthOpen: 0,
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      controls.update();

      if (activeVrm) {
        const humanoid = activeVrm.humanoid;
        const expr = expressionRef.current;
        const speaking = isTalkingRef.current;

        // --- Mood Pose Targets ---
        let targetHeadX = 0;
        let targetHeadY = 0;
        let targetHeadZ = 0;
        let targetSpineX = 0;
        let targetLeftArmZ = -1.25;
        let targetLeftArmX = 0.12;
        let targetRightArmZ = 1.25;
        let targetRightArmX = 0.12;
        let targetLeftElbowY = 0.35;
        let targetRightElbowY = -0.35;
        let targetLeftElbowX = -0.15;
        let targetRightElbowX = -0.15;

        if (expr === 'happy') {
          // Cheerful, hands brought slightly up, cute head tilt
          targetHeadZ = 0.08;
          targetHeadX = -0.04;
          targetSpineX = -0.02;
          targetLeftArmZ = -0.85;
          targetLeftArmX = 0.25;
          targetRightArmZ = 0.85;
          targetRightArmX = 0.25;
          targetLeftElbowY = 0.6;
          targetRightElbowY = -0.6;
          targetLeftElbowX = -0.35;
          targetRightElbowX = -0.35;
        } else if (expr === 'angry') {
          // Pouting, indignant stance, head turned slightly, crossed/hands on hips
          targetHeadY = 0.14;
          targetHeadX = 0.08;
          targetSpineX = 0.04;
          targetLeftArmZ = -0.95;
          targetLeftArmX = 0.35;
          targetRightArmZ = 0.95;
          targetRightArmX = 0.35;
          targetLeftElbowY = 0.8;
          targetRightElbowY = -0.8;
        } else if (expr === 'sad') {
          // Drooping shoulders, head hung down
          targetHeadX = 0.22;
          targetSpineX = 0.08;
          targetLeftArmZ = -1.35;
          targetRightArmZ = 1.35;
          targetLeftArmX = 0.18;
          targetRightArmX = 0.18;
        } else if (expr === 'surprised') {
          // Shocked, pulled back, hands slightly raised
          targetHeadX = -0.12;
          targetSpineX = -0.08;
          targetLeftArmZ = -0.75;
          targetRightArmZ = 0.75;
          targetLeftArmX = 0.2;
          targetRightArmX = 0.2;
          targetLeftElbowX = -0.4;
          targetRightElbowX = -0.4;
        } else if (expr === 'blushing') {
          // Shy, head tilted away and down, hand towards collar
          targetHeadY = -0.16;
          targetHeadX = 0.12;
          targetLeftArmZ = -0.65;
          targetLeftArmX = 0.3;
          targetLeftElbowY = 0.9;
          targetLeftElbowX = -0.6;
        } else if (expr === 'sleepy') {
          // Heavy drooping head, slow slouch
          targetHeadX = 0.26;
          targetHeadZ = 0.1;
          targetSpineX = 0.06;
          targetLeftArmZ = -1.3;
          targetRightArmZ = 1.3;
        }

        // Smooth Lerp Pose Transitions
        const lerpFactor = Math.min(1.0, delta * 4.0);
        currentPose.headX = THREE.MathUtils.lerp(currentPose.headX, targetHeadX, lerpFactor);
        currentPose.headY = THREE.MathUtils.lerp(currentPose.headY, targetHeadY, lerpFactor);
        currentPose.headZ = THREE.MathUtils.lerp(currentPose.headZ, targetHeadZ, lerpFactor);
        currentPose.spineX = THREE.MathUtils.lerp(currentPose.spineX, targetSpineX, lerpFactor);
        currentPose.leftArmZ = THREE.MathUtils.lerp(currentPose.leftArmZ, targetLeftArmZ, lerpFactor);
        currentPose.leftArmX = THREE.MathUtils.lerp(currentPose.leftArmX, targetLeftArmX, lerpFactor);
        currentPose.rightArmZ = THREE.MathUtils.lerp(currentPose.rightArmZ, targetRightArmZ, lerpFactor);
        currentPose.rightArmX = THREE.MathUtils.lerp(currentPose.rightArmX, targetRightArmX, lerpFactor);
        currentPose.leftElbowY = THREE.MathUtils.lerp(currentPose.leftElbowY, targetLeftElbowY, lerpFactor);
        currentPose.rightElbowY = THREE.MathUtils.lerp(currentPose.rightElbowY, targetRightElbowY, lerpFactor);
        currentPose.leftElbowX = THREE.MathUtils.lerp(currentPose.leftElbowX, targetLeftElbowX, lerpFactor);
        currentPose.rightElbowX = THREE.MathUtils.lerp(currentPose.rightElbowX, targetRightElbowX, lerpFactor);

        // Natural Idle Breathing & Micro-swaying
        const breathSpeed = expr === 'sleepy' ? 1.4 : expr === 'angry' ? 3.0 : 2.0;
        const breathAmp = expr === 'sad' ? 0.015 : 0.025;
        const breath = Math.sin(elapsed * breathSpeed) * breathAmp;
        const sway = Math.sin(elapsed * (breathSpeed * 0.5)) * 0.012;

        if (humanoid) {
          const spine = humanoid.getNormalizedBoneNode('spine');
          const chest = humanoid.getNormalizedBoneNode('chest');
          const head = humanoid.getNormalizedBoneNode('head');
          const hips = humanoid.getNormalizedBoneNode('hips');
          const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
          const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
          const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
          const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');

          if (spine) {
            spine.rotation.x = currentPose.spineX + breath;
            spine.rotation.y = sway * 0.5;
          }
          if (chest) {
            chest.rotation.x = breath * 0.5;
          }
          if (hips && expr === 'happy') {
            // Cute cheerful hip bounce
            hips.position.y = Math.abs(Math.sin(elapsed * 4.0)) * 0.012;
          }
          if (head) {
            head.rotation.x = currentPose.headX + breath * 0.4;
            head.rotation.y = currentPose.headY + sway;
            head.rotation.z = currentPose.headZ;
          }
          if (leftUpperArm) {
            leftUpperArm.rotation.set(currentPose.leftArmX, 0.05, currentPose.leftArmZ + breath * 0.2);
          }
          if (rightUpperArm) {
            rightUpperArm.rotation.set(currentPose.rightArmX, -0.05, currentPose.rightArmZ - breath * 0.2);
          }
          if (leftLowerArm) {
            leftLowerArm.rotation.set(currentPose.leftElbowX, currentPose.leftElbowY, 0.0);
          }
          if (rightLowerArm) {
            rightLowerArm.rotation.set(currentPose.rightElbowX, currentPose.rightElbowY, 0.0);
          }
        }

        // --- Natural Blinking System ---
        if (elapsed > nextBlinkTime) {
          isBlinking = true;
          blinkProgress = 0;
          nextBlinkTime = elapsed + 2.5 + Math.random() * 3.5;
        }

        if (isBlinking) {
          blinkProgress += delta * 8.0;
          const blinkVal = Math.sin(blinkProgress * Math.PI);
          if (blinkProgress >= 1.0) {
            isBlinking = false;
            activeVrm.expressionManager?.setValue('blink', 0);
          } else {
            activeVrm.expressionManager?.setValue('blink', Math.max(0, blinkVal));
          }
        }

        // --- Strict Lip-Sync System ---
        // Requirement 3: Only move mouth when audio is actually playing (NOT during text streaming!)
        const expressionManager = activeVrm.expressionManager;
        if (expressionManager) {
          if (speaking) {
            // Read live decibel volume from TTS service
            const liveVolume = ttsService.getAudioVolume();
            const targetMouth = Math.min(1.0, liveVolume * 1.5);
            currentPose.mouthOpen = THREE.MathUtils.lerp(currentPose.mouthOpen, targetMouth, Math.min(1.0, delta * 15.0));

            expressionManager.setValue('aa', currentPose.mouthOpen);
            expressionManager.setValue('oh', currentPose.mouthOpen * 0.4);
            expressionManager.setValue('ih', currentPose.mouthOpen * 0.2);
          } else {
            // Completely close mouth when not playing voice
            currentPose.mouthOpen = THREE.MathUtils.lerp(currentPose.mouthOpen, 0, Math.min(1.0, delta * 18.0));
            expressionManager.setValue('aa', currentPose.mouthOpen);
            expressionManager.setValue('oh', 0);
            expressionManager.setValue('ih', 0);
          }

          // Apply Facial Expressions
          expressionManager.setValue('happy', expr === 'happy' ? 0.9 : 0);
          expressionManager.setValue('sad', expr === 'sad' ? 0.85 : 0);
          expressionManager.setValue('angry', expr === 'angry' ? 0.9 : 0);
          expressionManager.setValue('surprised', expr === 'surprised' ? 0.95 : 0);
          expressionManager.setValue('relaxed', expr === 'blushing' || expr === 'sleepy' ? 0.8 : 0);
        }

        activeVrm.update(delta);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      if (activeVrm) {
        VRMUtils.deepDispose(activeVrm.scene);
      }
      renderer.dispose();
      container.innerHTML = '';
      currentVrmRef.current = null;
      controlsRef.current = null;
    };
  }, [vrmUrl]);

  // Camera Zoom & Reset Helpers
  const handleZoomIn = () => {
    if (!controlsRef.current) return;
    controlsRef.current.dollyIn(1.2);
    controlsRef.current.update();
  };

  const handleZoomOut = () => {
    if (!controlsRef.current) return;
    controlsRef.current.dollyOut(1.2);
    controlsRef.current.update();
  };

  const handleResetCamera = () => {
    if (!controlsRef.current || !cameraRef.current) return;
    const target = defaultCameraTargetRef.current;
    controlsRef.current.target.copy(target);
    cameraRef.current.position.set(0.0, target.y, 1.25);
    controlsRef.current.update();
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}>
      {/* WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-20">
          <Loader2 className="w-8 h-8 text-sakura-400 animate-spin mb-2" />
          <span className="text-xs font-medium text-slate-200 font-vazir">در حال آماده‌سازی مدل سه‌بعدی و استخوان‌بندی...</span>
        </div>
      )}

      {/* Error View */}
      {loadError && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/75 backdrop-blur-md z-20 font-vazir">
          <span className="text-xs text-rose-400 font-semibold mb-2">{loadError}</span>
          <span className="text-[11px] text-slate-400">لطفاً فایل استاندارد .vrm انتخاب کنید.</span>
        </div>
      )}

      {/* Camera Toolbar (Zoom In/Out, Reset Angle) */}
      {!loading && !loadError && (
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-white hover:bg-black/80 backdrop-blur-md transition shadow"
            title="بزرگ‌نمایی (Zoom In / اسکرول ماوس)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-white hover:bg-black/80 backdrop-blur-md transition shadow"
            title="کوچک‌نمایی (Zoom Out / اسکرول ماوس)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-white hover:bg-black/80 backdrop-blur-md transition shadow"
            title="بازنشانی زاویه دید (Reset View)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Helper Indicator */}
      {!loading && !loadError && (
        <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 text-[10px] text-slate-300 backdrop-blur-md pointer-events-none flex items-center gap-1.5 shadow font-vazir">
          <Eye className="w-3.5 h-3.5 text-sakura-400" />
          <span>چرخش، جابجایی (کلیک راست) و زوم (اسکرول) با ماوس</span>
        </div>
      )}
    </div>
  );
};
