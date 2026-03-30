/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Circle, Save, Trash2, RotateCcw, Download, Loader2, Youtube, Cat, ExternalLink, Info, Crop, Check, RotateCw, Maximize, Minimize, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import Cropper, { Area, Point } from 'react-easy-crop';

interface Marker {
  id: string;
  x: number; // percentage
  y: number; // percentage
}

interface CardSide {
  image: string | null;
  markers: Marker[];
  centering: string;
  corners: string;
  edges: string;
  surface: string;
}

type Agency = 'PSA' | 'CGC' | 'TAG' | 'X';
type CardType = 'SPORTS' | 'POKEMON' | 'YUGIOH';

const CARD_RATIOS = {
  SPORTS: 64 / 89,
  POKEMON: 63 / 88,
  YUGIOH: 59 / 86,
};

interface CropState {
  type: CardType;
  crop: Point;
  zoom: number;
  rotation: number;
  croppedAreaPixels: Area | null;
}

export default function App() {
  const [cardName, setCardName] = useState('');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Cropping related state
  const [showCropper, setShowCropper] = useState<{ side: 'front' | 'back', rawImage: string } | null>(null);
  const [cropState, setCropState] = useState<CropState>({
    type: 'SPORTS',
    crop: { x: 0, y: 0 },
    zoom: 1,
    rotation: 0,
    croppedAreaPixels: null,
  });
  
  const [front, setFront] = useState<CardSide>({
    image: null,
    markers: [],
    centering: '',
    corners: '',
    edges: '',
    surface: '',
  });

  const [back, setBack] = useState<CardSide>({
    image: null,
    markers: [],
    centering: '',
    corners: '',
    edges: '',
    surface: '',
  });

  const handleImageUpload = (side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setShowCropper({ side, rawImage: result });
        setCropState({
          type: 'SPORTS',
          crop: { x: 0, y: 0 },
          zoom: 1,
          rotation: 0,
          croppedAreaPixels: null,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCropState(prev => ({ ...prev, croppedAreaPixels }));
  }, []);

  const performCrop = async () => {
    if (!showCropper || !cropState.croppedAreaPixels) return;

    const img = new Image();
    img.src = showCropper.rawImage;
    await new Promise((resolve) => (img.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = CARD_RATIOS[cropState.type];
    const targetHeight = 1200; // High res
    const targetWidth = targetHeight * ratio;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const { x, y, width, height } = cropState.croppedAreaPixels;
    const rotation = cropState.rotation;

    // To handle rotation, we create a temporary canvas for the whole image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Calculate the size of the rotated image
    const rotRad = (rotation * Math.PI) / 180;
    const rotW = Math.abs(Math.cos(rotRad) * img.width) + Math.abs(Math.sin(rotRad) * img.height);
    const rotH = Math.abs(Math.sin(rotRad) * img.width) + Math.abs(Math.cos(rotRad) * img.height);

    tempCanvas.width = rotW;
    tempCanvas.height = rotH;

    tempCtx.translate(rotW / 2, rotH / 2);
    tempCtx.rotate(rotRad);
    tempCtx.drawImage(img, -img.width / 2, -img.height / 2);

    // Now draw the cropped area from the rotated image onto the main canvas
    ctx.drawImage(
      tempCanvas,
      x,
      y,
      width,
      height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // --- Draw Calibration Grid ---
    const w = targetWidth;
    const h = targetHeight;
    const centerX = w / 2;
    const centerY = h / 2;

    // 1. Ruler Crosshair
    const drawRulerCrosshair = () => {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Changed to Green
      ctx.lineWidth = 2;
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, h);
      ctx.stroke();
      
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();
      
      const tickSpacing = 20;
      const majorTickLength = 30;
      const minorTickLength = 15;
      
      // X axis ticks
      for (let i = 1; i * tickSpacing < w / 2; i++) {
        const isMajor = i % 5 === 0;
        const len = isMajor ? majorTickLength : minorTickLength;
        ctx.lineWidth = isMajor ? 3 : 1;
        
        // Right
        ctx.beginPath();
        ctx.moveTo(centerX + i * tickSpacing, centerY - len / 2);
        ctx.lineTo(centerX + i * tickSpacing, centerY + len / 2);
        ctx.stroke();
        
        // Left
        ctx.beginPath();
        ctx.moveTo(centerX - i * tickSpacing, centerY - len / 2);
        ctx.lineTo(centerX - i * tickSpacing, centerY + len / 2);
        ctx.stroke();
      }
      
      // Y axis ticks
      for (let i = 1; i * tickSpacing < h / 2; i++) {
        const isMajor = i % 5 === 0;
        const len = isMajor ? majorTickLength : minorTickLength;
        ctx.lineWidth = isMajor ? 3 : 1;
        
        // Down
        ctx.beginPath();
        ctx.moveTo(centerX - len / 2, centerY + i * tickSpacing);
        ctx.lineTo(centerX + len / 2, centerY + i * tickSpacing);
        ctx.stroke();
        
        // Up
        ctx.beginPath();
        ctx.moveTo(centerX - len / 2, centerY - i * tickSpacing);
        ctx.lineTo(centerX + len / 2, centerY - i * tickSpacing);
        ctx.stroke();
      }
      ctx.restore();
    };

    // 2. Main Calibration Grid
    const drawCalibrationGrid = () => {
      // A. Crosshair & Bullseye
      drawRulerCrosshair();
      
      ctx.save();
      // Bullseye
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // B. Non-linear concentric rectangles
      const numSquares = 10;
      ctx.setLineDash([8, 8]);
      ctx.globalAlpha = 0.5; // Alpha Blending
      
      for (let i = 1; i <= numSquares; i++) {
        const adjustedProgress = Math.pow(i / numSquares, 0.3);
        const rectW = w * adjustedProgress;
        const rectH = h * adjustedProgress;
        
        ctx.strokeStyle = i % 2 === 0 ? 'black' : 'red';
        ctx.lineWidth = 2;
        
        ctx.strokeRect(
          centerX - rectW / 2,
          centerY - rectH / 2,
          rectW,
          rectH
        );
      }
      
      ctx.restore();
      
      // D. L-shaped corner guides
      ctx.save();
      const lLen = 80;
      const lThick = 8;
      ctx.strokeStyle = 'red';
      ctx.lineWidth = lThick;
      ctx.lineCap = 'square';
      
      // Top Left
      ctx.beginPath();
      ctx.moveTo(0, lLen); ctx.lineTo(0, 0); ctx.lineTo(lLen, 0);
      ctx.stroke();
      
      // Top Right
      ctx.beginPath();
      ctx.moveTo(w - lLen, 0); ctx.lineTo(w, 0); ctx.lineTo(w, lLen);
      ctx.stroke();
      
      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(0, h - lLen); ctx.lineTo(0, h); ctx.lineTo(lLen, h);
      ctx.stroke();
      
      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(w - lLen, h); ctx.lineTo(w, h); ctx.lineTo(w, h - lLen);
      ctx.stroke();
      ctx.restore();
    };

    drawCalibrationGrid();
    // --- End Calibration Grid ---

    const croppedDataUrl = canvas.toDataURL('image/png');
    if (showCropper.side === 'front') {
      setFront(prev => ({ ...prev, image: croppedDataUrl, markers: [] }));
    } else {
      setBack(prev => ({ ...prev, image: croppedDataUrl, markers: [] }));
    }
    setShowCropper(null);
  };

  const addMarker = (side: 'front' | 'back', e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker: Marker = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
    };

    if (side === 'front') {
      setFront(prev => ({ ...prev, markers: [...prev.markers, newMarker] }));
    } else {
      setBack(prev => ({ ...prev, markers: [...prev.markers, newMarker] }));
    }
  };

  const removeMarker = (side: 'front' | 'back', id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (side === 'front') {
      setFront(prev => ({ ...prev, markers: prev.markers.filter(m => m.id !== id) }));
    } else {
      setBack(prev => ({ ...prev, markers: prev.markers.filter(m => m.id !== id) }));
    }
  };

  const resetSide = (side: 'front' | 'back') => {
    if (side === 'front') {
      setFront({
        image: null,
        markers: [],
        centering: '',
        corners: '',
        edges: '',
        surface: '',
      });
    } else {
      setBack({
        image: null,
        markers: [],
        centering: '',
        corners: '',
        edges: '',
        surface: '',
      });
    }
  };

  const handleSaveImage = async () => {
    if (!reportRef.current) return;
    
    setIsSaving(true);
    try {
      // Wait for any animations to settle and images to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const node = reportRef.current;
      
      // Get the actual dimensions of the element, adding a small buffer for shadows/borders
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: '#FDFCFB',
        width: width,
        height: height,
        pixelRatio: 2, // Higher quality
        style: {
          transform: 'none',
          margin: '0',
          padding: '0',
          borderRadius: '0', // Temporarily remove border radius to prevent clipping during capture
          overflow: 'visible',
        },
        // Ensure all images are captured
        filter: (node) => {
          // You can filter out elements if needed, but here we want everything
          return true;
        }
      });
      
      const link = document.createElement('a');
      link.download = `WSLife-Report-${cardName || 'untitled'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const renderSide = (side: 'front' | 'back', data: CardSide, setData: React.Dispatch<React.SetStateAction<CardSide>>) => {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md">
        <div className="flex items-center gap-2">
          <div className="w-2 h-8 bg-red-600 rounded-full" />
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">
            {side === 'front' ? '正面鑑定 (Front)' : '背面鑑定 (Back)'}
          </h3>
        </div>
        
        {/* Image Area */}
        <div 
          className={`relative aspect-[2.5/3.5] rounded-[32px] border-2 border-dashed transition-all duration-500 overflow-hidden shadow-xl group
            ${data.image ? 'border-transparent bg-white' : 'border-gray-200 hover:border-red-400 bg-white/50'}`}
          onClick={(e) => data.image && addMarker(side, e)}
        >
          {data.image ? (
            <>
              <img 
                src={data.image} 
                alt={`${side} of card`} 
                className="w-full h-full object-contain pointer-events-none p-4"
                referrerPolicy="no-referrer"
              />
              {/* Markers */}
              {data.markers.map((marker) => (
                <motion.div
                  key={marker.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute w-8 h-8 -ml-4 -mt-4 bg-red-600/80 border-2 border-white rounded-full flex items-center justify-center cursor-pointer shadow-2xl hover:bg-red-700 transition-colors z-10"
                  style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  onClick={(e) => removeMarker(side, marker.id, e)}
                >
                  <X className="w-4 h-4 text-white" />
                </motion.div>
              ))}
              <button 
                onClick={(e) => { e.stopPropagation(); resetSide(side); }}
                className="absolute top-4 right-4 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 no-print"
                data-html2canvas-ignore="true"
              >
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </button>
            </>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-10 h-10 text-red-500" />
              </div>
              <span className="text-lg font-medium text-gray-600">點擊上傳卡片照片</span>
              <span className="text-sm text-gray-400 mt-1">支援 JPG, PNG 格式</span>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(side, e)} 
              />
            </label>
          )}
        </div>

        {/* Condition Details */}
        <div className="space-y-4 bg-white p-6 rounded-[32px] shadow-lg border border-gray-50">
          {[
            { label: '置中', key: 'centering', placeholder: '例如: 50/50' },
            { label: '四角', key: 'corners', placeholder: '描述四角狀況' },
            { label: '邊緣', key: 'edges', placeholder: '描述邊緣狀況' },
            { label: '表面', key: 'surface', placeholder: '描述表面狀況' }
          ].map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-gray-500 ml-1 uppercase tracking-wider">{field.label}</label>
              <input 
                type="text" 
                value={(data as any)[field.key]}
                onChange={(e) => setData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3 text-base transition-all outline-none shadow-inner"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-ws-blue text-gray-900 p-4 md:p-12 font-sans selection:bg-ws-red/10 selection:text-ws-red">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* YouTube Branded Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print bg-white/10 backdrop-blur-md p-6 rounded-[32px] border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-ws-red rounded-2xl flex items-center justify-center shadow-xl shadow-ws-red/20">
              <Cat className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase">W.S.Life</h1>
              <p className="text-ws-orange font-bold flex items-center gap-1">
                水緣君日常 <span className="text-white/60 font-normal ml-1">| 卡片鑑定紀錄</span>
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <a 
              href="https://www.youtube.com/@W.S.Life0809" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-3 bg-ws-red text-white rounded-2xl hover:bg-ws-red/90 transition-all group shadow-lg shadow-ws-red/30"
            >
              <Youtube className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="font-bold">訂閱頻道</span>
              <ExternalLink className="w-4 h-4 opacity-60" />
            </a>
          </div>
        </div>

        <div ref={reportRef} className="bg-white rounded-[40px] relative overflow-hidden shadow-2xl">
          {/* Torn Paper Header */}
          <header className="relative bg-ws-navy text-white pt-12 pb-20 px-8 md:px-12">
            <div className="absolute bottom-0 left-0 w-full h-12 bg-white torn-paper-edge-bottom" />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
              <div className="space-y-4 flex-1 w-full">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-ws-red text-white text-xs font-black rounded-full uppercase tracking-widest">Official Report</span>
                  <div className="h-px flex-1 bg-white/20" />
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-black text-ws-orange/30">01</span>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1 block">Card Name</label>
                    <input 
                      type="text" 
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="輸入卡片名稱..."
                      className="w-full text-3xl md:text-4xl font-black bg-transparent border-none focus:ring-0 outline-none p-0 placeholder:text-white/10 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-[200px]">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] block">Grading Agency</label>
                <div className="flex gap-2">
                  {(['PSA', 'CGC', 'TAG', 'X'] as Agency[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAgency(agency === opt ? null : opt)}
                      className={`flex-1 py-3 rounded-xl font-black text-sm italic transition-all border-2 
                        ${agency === opt 
                          ? 'bg-ws-orange border-ws-orange text-white shadow-lg shadow-ws-orange/20 scale-105' 
                          : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30 hover:text-white'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <div className="p-8 md:p-12">
            {/* Grading Sections */}
            <main className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start relative z-10">
              {renderSide('front', front, setFront)}
              {renderSide('back', back, setBack)}
            </main>

            {/* Report Footer Branding */}
            <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ws-navy rounded-xl flex items-center justify-center">
                  <Cat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="font-black uppercase text-sm tracking-widest block text-ws-navy">W.S.Life Report</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Card Condition Documentation</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generated on</p>
                <p className="text-sm font-black text-ws-navy">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4 no-print">
          <div className="flex items-center gap-3 text-white/60 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/10">
            <Info className="w-5 h-5 text-ws-orange" />
            <p className="text-sm font-medium">
              點擊圖片標記損傷位置，再次點擊可移除。
            </p>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => {
<<<<<<< HEAD
<<<<<<< HEAD
                if(confirm('確定要清除所有紀錄嗎？')) {
                  setCardName('');
                  setAgency(null);
                  resetSide('front');
                  resetSide('back');
                }
=======
=======
>>>>>>> parent of 667ca39 (Update App.tsx)
                setCardName('');
                setAgency(null);
                resetSide('front');
                resetSide('back');
<<<<<<< HEAD
>>>>>>> parent of 667ca39 (Update App.tsx)
=======
>>>>>>> parent of 667ca39 (Update App.tsx)
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl transition-all font-bold"
            >
              <Trash2 className="w-5 h-5" />
              清除
            </button>
            <button 
              disabled={isSaving}
              className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-4 bg-ws-red hover:bg-ws-red/90 text-white rounded-2xl shadow-xl shadow-ws-red/20 transition-all font-black text-lg disabled:opacity-70`}
              onClick={handleSaveImage}
            >
              {isSaving ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Download className="w-6 h-6" />
              )}
              {isSaving ? '正在生成報告...' : '儲存鑑定報告'}
            </button>
          </div>
        </footer>
      </div>

      {/* Cropping Modal */}
      <AnimatePresence>
        {showCropper && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ws-navy/90 backdrop-blur-md p-4"
          >
            <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ws-orange rounded-xl flex items-center justify-center">
                    <Crop className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-ws-navy">裁切卡片照片</h2>
                </div>
                <button onClick={() => setShowCropper(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Preview Area */}
                <div className="flex-1 bg-gray-900 relative overflow-hidden flex flex-col">
                  <div className="flex-1 relative overflow-hidden bg-gray-950">
                    <Cropper
                      image={showCropper.rawImage}
                      crop={cropState.crop}
                      zoom={cropState.zoom}
                      rotation={cropState.rotation}
                      aspect={CARD_RATIOS[cropState.type]}
                      onCropChange={(crop) => setCropState(prev => ({ ...prev, crop }))}
                      onCropComplete={onCropComplete}
                      onZoomChange={(zoom) => setCropState(prev => ({ ...prev, zoom }))}
                      onRotationChange={(rotation) => setCropState(prev => ({ ...prev, rotation }))}
                    />
                  </div>
                </div>
              </div>

              {/* Controls Area */}
                <div className="w-full lg:w-80 bg-white p-8 space-y-8 border-l border-gray-100 overflow-y-auto">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">1. 選擇卡片類型</label>
                    <div className="grid grid-cols-1 gap-2">
                      {(['SPORTS', 'POKEMON', 'YUGIOH'] as CardType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setCropState(prev => ({ ...prev, type: t }))}
                          className={`px-4 py-3 rounded-xl font-bold text-sm transition-all border-2 text-left flex justify-between items-center
                            ${cropState.type === t 
                              ? 'bg-ws-blue border-ws-blue text-white shadow-md' 
                              : 'bg-white border-gray-100 text-gray-400 hover:border-ws-blue/30'}`}
                        >
                          {t === 'SPORTS' ? '球員卡 (64x89)' : t === 'POKEMON' ? '寶可夢 (63x88)' : '遊戲王 (59x86)'}
                          {cropState.type === t && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">2. 調整裁切</label>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-ws-navy flex items-center gap-2">
                            <ZoomIn className="w-3 h-3" /> 縮放 (Zoom)
                          </span>
                          <span className="text-xs font-mono font-bold text-ws-blue">{cropState.zoom.toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range"
                          min={1}
                          max={3}
                          step={0.1}
                          value={cropState.zoom}
                          onChange={(e) => setCropState(prev => ({ ...prev, zoom: Number(e.target.value) }))}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-ws-blue"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-ws-navy flex items-center gap-2">
                            <RotateCw className="w-3 h-3" /> 旋轉 (Rotation)
                          </span>
                          <span className="text-xs font-mono font-bold text-ws-blue">{cropState.rotation}°</span>
                        </div>
                        <input 
                          type="range"
                          min={0}
                          max={360}
                          step={1}
                          value={cropState.rotation}
                          onChange={(e) => setCropState(prev => ({ ...prev, rotation: Number(e.target.value) }))}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-ws-blue"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={performCrop}
                      className="w-full py-4 bg-ws-red text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-6 h-6" />
                      完成裁切
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}