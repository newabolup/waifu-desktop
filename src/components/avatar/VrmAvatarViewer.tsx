import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';
import { AvatarExpression } from '../../types/character';
import { Loader2, RefreshCw, Eye } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep track of talking state for animation loop
  const isTalkingRef = useRef(isTalking);
  isTalkingRef.current = isTalking;

  const expressionRef = useRef(expression);
  expressionRef.current = expression;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !vrmUrl) return;

    setLoading(true);
    setLoadError(null);

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 420;

    const camera = new THREE.PerspectiveCamera(30.0, width / height, 0.1, 20.0);
    camera.position.set(0.0, 1.35, 1.4); // Focus on upper body / chest-head

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Clear previous canvas
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(1.0, 2.0, 1.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff99bb, 1.0);
    rimLight.position.set(-1.0, 1.5, -1.0);
    scene.add(rimLight);

    // 3. Interactive Mouse Controls
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let rotY = Math.PI; // Face forward initially
    let rotX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;
      prevMousePos = { x: e.clientX, y: e.clientY };

      rotY += deltaX * 0.008;
      rotX = Math.max(-0.2, Math.min(0.2, rotX + deltaY * 0.005));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 4. Load VRM Model
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let activeVrm: VRM | null = null;
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let nextBlinkTime = 2.0;
    let isBlinking = false;
    let blinkProgress = 0;

    loader.load(
      vrmUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          setLoadError('فایل نامعتبر است: داده‌های VRM در فایل پیدا نشد.');
          setLoading(false);
          onError?.('Invalid VRM file');
          return;
        }

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // Position model facing camera
        vrm.scene.rotation.y = Math.PI;
        scene.add(vrm.scene);

        // Adjust camera focus to model's head / upper chest
        const headNode = vrm.humanoid?.getNormalizedBoneNode('head');
        if (headNode) {
          const headPos = new THREE.Vector3();
          headNode.getWorldPosition(headPos);
          camera.position.set(0.0, headPos.y - 0.05, 1.25);
          camera.lookAt(0.0, headPos.y - 0.05, 0.0);
        } else {
          camera.position.set(0.0, 1.3, 1.4);
          camera.lookAt(0.0, 1.25, 0.0);
        }

        activeVrm = vrm;
        currentVrmRef.current = vrm;
        setLoading(false);
        onLoaded?.(vrm);
      },
      (progress) => {
        // progress callback
      },
      (error) => {
        console.error('Failed to load VRM:', error);
        setLoadError('خطا در بارگذاری مدل VRM');
        setLoading(false);
        onError?.(String(error));
      }
    );

    // 5. Render & Animation Loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (activeVrm) {
        // Breathing animation
        const spine = activeVrm.humanoid?.getNormalizedBoneNode('spine');
        if (spine) {
          spine.rotation.x = Math.sin(elapsed * 2.0) * 0.02;
        }

        // Apply rotation from mouse drag
        activeVrm.scene.rotation.y = rotY;
        activeVrm.scene.rotation.x = rotX;

        // Blinking system
        if (elapsed > nextBlinkTime) {
          isBlinking = true;
          blinkProgress = 0;
          nextBlinkTime = elapsed + 3.0 + Math.random() * 3.0;
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

        // Talking mouth sync animation
        if (isTalkingRef.current) {
          const mouthOpen = (Math.sin(elapsed * 12.0) + 1.0) * 0.45;
          activeVrm.expressionManager?.setValue('aa', mouthOpen);
          activeVrm.expressionManager?.setValue('oh', mouthOpen * 0.3);
        } else {
          activeVrm.expressionManager?.setValue('aa', 0);
          activeVrm.expressionManager?.setValue('oh', 0);
        }

        // Facial Expressions
        const expr = expressionRef.current;
        const manager = activeVrm.expressionManager;
        if (manager) {
          // Reset mood expressions
          manager.setValue('happy', expr === 'happy' ? 0.9 : 0);
          manager.setValue('sad', expr === 'sad' ? 0.85 : 0);
          manager.setValue('angry', expr === 'angry' ? 0.85 : 0);
          manager.setValue('surprised', expr === 'surprised' ? 0.9 : 0);
          manager.setValue('relaxed', expr === 'blushing' || expr === 'sleepy' ? 0.8 : 0);
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

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (activeVrm) {
        VRMUtils.deepDispose(activeVrm.scene);
      }
      renderer.dispose();
      container.innerHTML = '';
      currentVrmRef.current = null;
    };
  }, [vrmUrl]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}>
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center" />

      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20">
          <Loader2 className="w-8 h-8 text-sakura-400 animate-spin mb-2" />
          <span className="text-xs font-medium text-slate-200">در حال بارگذاری مدل سه‌بعدی VRM...</span>
        </div>
      )}

      {/* Error View */}
      {loadError && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/70 backdrop-blur-md z-20">
          <span className="text-xs text-rose-400 font-semibold mb-2">{loadError}</span>
          <span className="text-[11px] text-slate-400">لطفاً فایل معتبر .vrm با استاندارد VRM 0.0 یا 1.0 انتخاب کنید.</span>
        </div>
      )}

      {/* Interactive Helper Indicator */}
      {!loading && !loadError && (
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/50 border border-white/10 text-[9px] text-slate-400 backdrop-blur-sm pointer-events-none flex items-center gap-1">
          <Eye className="w-3 h-3 text-sakura-400" />
          <span>چرخش با ماوس</span>
        </div>
      )}
    </div>
  );
};
