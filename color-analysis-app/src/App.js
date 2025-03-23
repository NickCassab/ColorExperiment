import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

// Convert RGB to HSV
function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, v = max;

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0; // Default case added
    }
    h /= 6;
  }

  return [h, s, v];
}

// Modified CustomOrbitControls to maintain camera state
const CustomOrbitControls = () => {
  const controlsRef = useRef();
  const { camera, gl } = useThree();
  
  useEffect(() => {
    if (controlsRef.current) {
      // Disable panning
      controlsRef.current.enablePan = false;
    }
  }, []);
  
  return <OrbitControls ref={controlsRef} args={[camera, gl.domElement]} />;
};

// Modified SceneSetup to handle both camera and scene
const SceneSetup = ({ colorMode }) => {
  const { camera } = useThree();
  const cameraStateRef = useRef({
    position: null,
    rotation: null,
    initialized: false
  });
  
  // Set up initial camera position once
  useEffect(() => {
    if (!cameraStateRef.current.initialized) {
      // Initial camera position
      camera.position.set(3, 3, 3);
      camera.lookAt(0, 0, 0);
      
      // Store initial state
      cameraStateRef.current.position = camera.position.clone();
      cameraStateRef.current.rotation = camera.rotation.clone();
      cameraStateRef.current.initialized = true;
    }
  }, [camera]);
  
  // Prevent re-initializing on colorMode change
  useEffect(() => {
    // If we have stored camera state, ensure it's preserved
    if (cameraStateRef.current.initialized) {
      // No need to reset camera - we want to maintain user's view
      camera.updateProjectionMatrix();
    }
  }, [colorMode, camera]);
  
  return null;
};

// Point Cloud Component with animation - fixed version with proper reset
const PointCloud = ({ pixels, colorMode, imageKey }) => {
  const pointsRef = useRef();
  const [animating, setAnimating] = useState(false);
  const [startPositions, setStartPositions] = useState([]);
  const [targetPositions, setTargetPositions] = useState([]);
  const [progress, setProgress] = useState(0);
  const [currentPositions, setCurrentPositions] = useState([]);
  const previousColorModeRef = useRef(colorMode);
  const previousImageKeyRef = useRef(imageKey);
  
  // Get viewport size to adjust point size responsively
  const { viewport } = useThree();
  const responsivePointSize = Math.max(0.05, 0.05 * (1 / (viewport.width / 10)));

  // Reset everything when a new image is loaded (imageKey changes)
  useEffect(() => {
    if (previousImageKeyRef.current !== imageKey) {
      // Clear all state
      setStartPositions([]);
      setTargetPositions([]);
      setCurrentPositions([]);
      setProgress(0);
      setAnimating(false);
      
      // If there's an existing geometry, dispose of it to free GPU memory
      if (pointsRef.current && pointsRef.current.geometry) {
        if (pointsRef.current.geometry.dispose) {
          pointsRef.current.geometry.dispose();
        }
        
        if (pointsRef.current.material && pointsRef.current.material.dispose) {
          pointsRef.current.material.dispose();
        }
      }
      
      // Update the reference
      previousImageKeyRef.current = imageKey;
      previousColorModeRef.current = colorMode;
    }
  }, [imageKey, colorMode]);

  // Prepare positions based on color mode
  useEffect(() => {
    if (!pixels || pixels.length === 0) return;

    const rgbPositions = [];
    const hsvPositions = [];
    const colors = [];

    pixels.forEach(pixel => {
      const { r, g, b } = pixel;
      
      // RGB positions (normalized to -1 to 1)
      const xPosRgb = (r / 255) * 2 - 1;
      const yPosRgb = (g / 255) * 2 - 1;
      const zPosRgb = (b / 255) * 2 - 1;
      
      rgbPositions.push(xPosRgb, yPosRgb, zPosRgb);
      
      // HSV positions (normalized to -1 to 1)
      const [h, s, v] = rgbToHsv(r, g, b);
      const xPosHsv = h * 2 - 1;           // Hue maps from 0-1 to -1 to 1
      const yPosHsv = s * 2 - 1;           // Saturation maps from 0-1 to -1 to 1
      const zPosHsv = v * 2 - 1;           // Value maps from 0-1 to -1 to 1
      
      hsvPositions.push(xPosHsv, yPosHsv, zPosHsv);
      
      // Colors stay the same (RGB)
      colors.push(r / 255, g / 255, b / 255);
    });

    // Update geometry with colors
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      // First render - set positions directly
      if (currentPositions.length === 0) {
        const initialPositions = colorMode === 'rgb' ? rgbPositions : hsvPositions;
        setCurrentPositions(initialPositions);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(initialPositions, 3));
      }
    }

    // Only start a new animation if the colorMode has changed
    if (previousColorModeRef.current !== colorMode) {
      // Always use current positions as starting point
      const positionsToUse = currentPositions.length > 0 ? 
                             [...currentPositions] : 
                             (colorMode === 'rgb' ? hsvPositions : rgbPositions);
      
      setStartPositions(positionsToUse);
      setTargetPositions(colorMode === 'rgb' ? rgbPositions : hsvPositions);
      
      if (pointsRef.current && pixels.length > 0) {
        setAnimating(true);
        setProgress(0);
      }
      
      // Update the ref to track colorMode changes
      previousColorModeRef.current = colorMode;
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixels, colorMode, imageKey]);

  // Animation frame
  useFrame(() => {
    if (!animating || !pointsRef.current) return;

    // Update progress with smoother animation
    setProgress(prev => {
      const newProgress = prev + 0.02; // Animation speed
      
      if (newProgress >= 1) {
        setAnimating(false);
        return 1;
      }
      
      return newProgress;
    });

    // Apply easing
    const easedProgress = easeInOutCubic(progress);
    
    // Interpolate positions
    if (startPositions.length > 0 && targetPositions.length > 0) {
      const newPositions = [];
      
      const minLength = Math.min(startPositions.length, targetPositions.length);
      for (let i = 0; i < minLength; i += 3) {
        // Handle array boundary check
        if (i + 2 < minLength) {
          const x1 = startPositions[i];
          const y1 = startPositions[i + 1];
          const z1 = startPositions[i + 2];
          
          const x2 = targetPositions[i];
          const y2 = targetPositions[i + 1];
          const z2 = targetPositions[i + 2];
          
          newPositions.push(
            x1 + (x2 - x1) * easedProgress,
            y1 + (y2 - y1) * easedProgress,
            z1 + (z2 - z1) * easedProgress
          );
        }
      }
      
      // Store current positions for next transition
      setCurrentPositions(newPositions);
      
      // Update geometry if we have valid positions
      if (newPositions.length > 0 && pointsRef.current) {
        const geometry = pointsRef.current.geometry;
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (pointsRef.current) {
        if (pointsRef.current.geometry) {
          pointsRef.current.geometry.dispose();
        }
        if (pointsRef.current.material) {
          pointsRef.current.material.dispose();
        }
      }
    };
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial size={responsivePointSize} vertexColors sizeAttenuation={true} />
    </points>
  );
};

// Easing function for smoother animation
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// Subtle Axes Helper Component
const AxesHelper = ({ colorMode }) => {
  return (
    <group>
      <axesHelper args={[0.1]} />
    </group>
  );
};

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [pixels, setPixels] = useState([]);
  const [colorMode, setColorMode] = useState('rgb'); // 'rgb' or 'hsv'
  const [showInstructions, setShowInstructions] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  // Add a key to force complete re-mounting of components
  const [imageKey, setImageKey] = useState(Date.now());
  
  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Handle file upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
      setError('Please upload an image file');
      return;
    }
    
    setError(null);
    // Reset completely before loading new image
    setPixels([]);
    // Generate a new key to force complete remounting
    setImageKey(Date.now());
    processImage(file);
  };
  
  // Process the uploaded image
  const processImage = (file) => {
    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to get pixel data
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Process pixel data
        processPixelData(imgData);
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  };
  
  // Process pixel data to extract color information
  const processPixelData = (imgData) => {
    const { data, width, height } = imgData;
    const newPixels = [];
    
    // Dynamically adjust sampling rate based on image size for better performance
    // Larger images use a higher sampling rate
    const baseSamplingRate = 4;
    const imageSizeFactor = Math.max(1, Math.sqrt((width * height) / (1000 * 1000)));
    const samplingRate = Math.max(1, Math.floor(baseSamplingRate * imageSizeFactor));
    
    for (let y = 0; y < height; y += samplingRate) {
      for (let x = 0; x < width; x += samplingRate) {
        const i = (y * width + x) * 4;
        
        // Get RGB values
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Skip fully transparent pixels
        if (a < 10) continue;
        
        newPixels.push({ r, g, b });
      }
    }
    
    setPixels(newPixels);
    setIsProcessing(false);
  };
  
  // Toggle between RGB and HSV color modes
  const toggleColorMode = () => {
    setColorMode(prev => prev === 'rgb' ? 'hsv' : 'rgb');
  };
  
  // Complete reset function
  const handleReset = () => {
    setPixels([]);
    setColorMode('rgb');
    setImageKey(Date.now());
  };
  
  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.match('image.*')) {
        processImage(file);
      } else {
        setError('Please upload an image file');
      }
    }
  };
  
  // Adjust UI layout based on screen size
  const isMobile = windowSize.width < 768;
  
  return (
    <div className="app-container">
      {/* Visualization Area */}
      <div className="canvas-container">
        <Canvas camera={{ fov: 50 }} key={`canvas-${imageKey}`}>
          <color attach="background" args={["#f0f0f0"]} />
          
          {/* Scene and camera setup */}
          <SceneSetup colorMode={colorMode} />
          
          {/* Point cloud */}
          <PointCloud pixels={pixels} colorMode={colorMode} imageKey={imageKey} />
          
          {/* Axes */}
          <AxesHelper colorMode={colorMode} />
          
          {/* Controls with panning disabled */}
          <CustomOrbitControls />
        </Canvas>
        
        {/* Upload Overlay (shown when no image is uploaded) */}
        {pixels.length === 0 && !isProcessing && (
          <div className="upload-overlay" 
               onDragOver={handleDragOver}
               onDrop={handleDrop}
               onClick={() => document.getElementById('file-upload').click()}>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden-input"
            />
            <div className="upload-content">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="black" strokeWidth="1.5" />
                <path d="M12 8V16" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M16 12H8" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p>Drop image here<br />or click to upload</p>
            </div>
          </div>
        )}
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="processing-overlay">
            <div className="spinner"></div>
            <p>Analyzing color space...</p>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="error-overlay">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        
        {/* Control Bar (only shown when image is processed) */}
        {pixels.length > 0 && !isProcessing && (
          <div className={`control-bar ${isMobile ? 'mobile' : ''}`}>
            <div className="control-bar-content">
              <div className="mode-indicator">
                <div className={`mode-icon ${colorMode === 'rgb' ? 'active' : ''}`}>RGB</div>
                <div className="mode-switch">
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={colorMode === 'hsv'}
                      onChange={toggleColorMode}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className={`mode-icon ${colorMode === 'hsv' ? 'active' : ''}`}>HSV</div>
              </div>
              
              <div className="control-buttons">
                <button 
                  className="info-button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  aria-label="Information"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 16V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M12 8H12.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <button 
                  className="reset-button"
                  onClick={handleReset}
                  aria-label="Reset"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Instructions Panel */}
        {showInstructions && (
          <div className={`instructions-panel ${isMobile ? 'mobile' : ''}`}>
            <button className="close-button" onClick={() => setShowInstructions(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            
            <h2>Color Space Analysis</h2>
            
            <div className="mode-description">
              <h3>Current Mode: {colorMode === 'rgb' ? 'RGB' : 'HSV'}</h3>
              
              {colorMode === 'rgb' ? (
                <div className="coordinates-info">
                  <div className="coordinate">
                    <div className="coordinate-color" style={{backgroundColor: '#ff3b30'}}></div>
                    <div className="coordinate-label">X = Red (0-255)</div>
                  </div>
                  <div className="coordinate">
                    <div className="coordinate-color" style={{backgroundColor: '#34c759'}}></div>
                    <div className="coordinate-label">Y = Green (0-255)</div>
                  </div>
                  <div className="coordinate">
                    <div className="coordinate-color" style={{backgroundColor: '#007aff'}}></div>
                    <div className="coordinate-label">Z = Blue (0-255)</div>
                  </div>
                </div>
              ) : (
                <div className="coordinates-info">
                  <div className="coordinate">
                    <div className="coordinate-color" style={{backgroundColor: '#ff9500'}}></div>
                    <div className="coordinate-label">X = Hue (color tone)</div>
                  </div>
                  <div className="coordinate">
                    <div className="coordinate-color" style={{backgroundColor: '#5ac8fa'}}></div>
                    <div className="coordinate-label">Y = Saturation (color intensity)</div>
                  </div>
                  <div className="coordinate">
                    <div className="coordinate-color" style={{backgroundColor: '#fff'}}></div>
                    <div className="coordinate-label">Z = Value (brightness)</div>
                  </div>
                </div>
              )}
              
              <p className="description-text">
                {colorMode === 'rgb' 
                  ? "The RGB model visualizes how red, green, and blue light combine to create colors. Points clustered together in this space have similar RGB compositions."
                  : "The HSV model separates color (Hue) from intensity (Saturation) and brightness (Value), revealing different relationships between colors than the RGB model."}
              </p>
            </div>
            
            <div className="controls-info">
              <h3>Navigation Controls</h3>
              <ul>
                <li>Rotate: Click and drag</li>
                <li>Zoom: Scroll or pinch</li>
                <li>Pan: Disabled</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;