import React, { useEffect, useRef, useState } from 'react';
import HandParticleScene from './components/HandParticleScene';
import { analyzeHand } from './services/gestureService';
import { HandMetrics } from './types';

// Define minimal types for MediaPipe since we are loading it globally
interface Results {
  multiHandLandmarks: any[][];
  multiHandedness?: any[];
  image: any;
}

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [metrics, setMetrics] = useState<HandMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    let active = true;
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    let hands: any = null;

    // 1. Setup MediaPipe Hands
    // We access the global window.Hands injected by the script tag in index.html
    const Hands = (window as any).Hands;
    
    if (Hands) {
      hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: Results) => {
        // Hide loader once we start getting results (even empty ones confirm pipeline is working)
        setLoading(false);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          const computedMetrics = analyzeHand(landmarks);
          setMetrics(computedMetrics);
        }
      });
    } else {
      console.error("MediaPipe Hands script not loaded.");
      setPermissionError(true);
      return;
    }

    // 2. Setup Camera manually using native API
    const startCamera = async () => {
      try {
        if (!videoRef.current) return;

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'user', // Use front camera
          }
        });

        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video metadata to load (dimensions)
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => {
                videoRef.current!.play();
                resolve();
              };
            }
          });

          // Start the processing loop
          const frameLoop = async () => {
            if (!active) return;

            if (videoRef.current && videoRef.current.readyState >= 2 && hands) {
              await hands.send({ image: videoRef.current });
            }
            
            if (active) {
              animationFrameId = requestAnimationFrame(frameLoop);
            }
          };
          
          frameLoop();
        }
      } catch (err) {
        console.error("Camera error:", err);
        setPermissionError(true);
        setLoading(false);
      }
    };

    startCamera();

    // Cleanup
    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
      if (hands) {
        hands.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-purple-900 to-black text-white font-sans">
      
      {/* Hidden Video Input for MediaPipe */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />

      {/* 3D Scene */}
      <HandParticleScene handMetrics={metrics} />

      {/* Minimal Overlay UI */}
      <div className="absolute top-0 left-0 p-6 pointer-events-none z-10 w-full">
        <h1 className="text-2xl font-bold tracking-wider opacity-80">GESTURE PARTICLES</h1>
        <div className="mt-2 text-sm text-gray-300 opacity-70 max-w-md">
          <p>👆 1: Heart | 2: Flower | 3: Portal | 4: Star | 5: Tree</p>
          <p>👊 Fist + Move X: Paint Color (Hold to Shrink/Spin)</p>
          <p>✋ Open Hand: Expand Particles</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && !permissionError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-xl">Initializing Vision...</p>
            <p className="text-sm text-gray-400 mt-2">Please allow camera access.</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {permissionError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
           <div className="text-center max-w-md p-6 bg-red-900 bg-opacity-50 rounded-lg border border-red-700">
            <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
            <p>We need access to your camera to detect hand gestures. No data is sent to a server; processing happens locally in your browser.</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-white text-black rounded hover:bg-gray-200 pointer-events-auto"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      {/* Debug Info (Optional, bottom right) */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 font-mono text-right">
        {metrics ? (
          <>
            <span className={metrics.isFist ? "text-yellow-400 font-bold" : ""}>
              {metrics.isFist ? "MODE: FIST (COLOR/SPIN)" : `FINGERS: ${metrics.fingerCount}`}
            </span>
            <br />
            DEPTH: {metrics.palmDepth.toFixed(3)}
          </>
        ) : "NO HAND DETECTED"}
      </div>

    </div>
  );
};

export default App;