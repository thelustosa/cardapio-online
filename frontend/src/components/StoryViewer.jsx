import React, { useState, useEffect, useRef } from 'react';
import { X, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './StoryViewer.module.css';

const STORY_DURATION = 15000; // 15 seconds per image

const StoryViewer = ({ items, initialIndex, onClose, apiBaseUrl }) => {
  const [currentItemIndex, setCurrentItemIndex] = useState(initialIndex);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedProgressRef = useRef(0);
  const videoRef = useRef(null);

  const currentItem = items[currentItemIndex];

  const parseImage = (image) => {
    if (!image) return [];
    if (Array.isArray(image)) return image.flat(Infinity);
    if (typeof image === 'string') {
      if (image.startsWith('[') || image.startsWith('{')) {
        try {
          const parsed = JSON.parse(image);
          return Array.isArray(parsed) ? parsed.flat(Infinity) : [parsed];
        } catch { return [image]; }
      }
      return [image];
    }
    return [];
  };

  const rawImages = parseImage(currentItem?.image);
  const mediaList = rawImages.length > 0 ? rawImages : [null]; 
  
  const currentMediaUrl = mediaList[currentMediaIndex];
  const isVideo = currentMediaUrl && typeof currentMediaUrl === 'string' && 
                  (currentMediaUrl.endsWith('.mp4') || currentMediaUrl.endsWith('.webm') || currentMediaUrl.endsWith('.mov'));
  const displayMedia = currentMediaUrl ? (currentMediaUrl.startsWith('/uploads/') ? `${apiBaseUrl}${currentMediaUrl}` : currentMediaUrl) : null;

  // Handle image timer
  useEffect(() => {
    if (isVideo) {
      if (isPaused && videoRef.current) {
        videoRef.current.pause();
      } else if (!isPaused && videoRef.current) {
        videoRef.current.play().catch(e => console.log('Autoplay blocked:', e));
      }
      return; 
    }

    if (isPaused) {
      pausedProgressRef.current = progress;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = (time) => {
      if (!startTimeRef.current) {
        startTimeRef.current = time - (pausedProgressRef.current / 100) * STORY_DURATION;
      }
      
      const elapsed = time - startTimeRef.current;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      
      setProgress(newProgress);

      if (newProgress >= 100) {
        handleNext();
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (videoRef.current) videoRef.current.pause(); // Cleanup video
    };
  }, [currentItemIndex, currentMediaIndex, isPaused, isVideo]);

  // Reset progress when index changes
  useEffect(() => {
    setProgress(0);
    pausedProgressRef.current = 0;
    startTimeRef.current = null;
  }, [currentItemIndex, currentMediaIndex, isVideo]);


  const handleNext = () => {
    if (currentMediaIndex < mediaList.length - 1) {
      setCurrentMediaIndex(prev => prev + 1);
    } else {
      if (currentItemIndex < items.length - 1) {
        setCurrentItemIndex(prev => prev + 1);
        setCurrentMediaIndex(0);
      } else {
        onClose();
      }
    }
  };

  const handlePrev = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    } else {
      if (currentItemIndex > 0) {
        const prevItemIndex = currentItemIndex - 1;
        const prevItem = items[prevItemIndex];
        const prevRaw = parseImage(prevItem?.image);
        const prevMediaList = prevRaw.length > 0 ? prevRaw : [null];
        
        setCurrentItemIndex(prevItemIndex);
        setCurrentMediaIndex(prevMediaList.length - 1);
      } else {
        // At absolute beginning, just restart
        setProgress(0);
        pausedProgressRef.current = 0;
        if (isVideo && videoRef.current) {
           videoRef.current.currentTime = 0;
        } else {
           startTimeRef.current = performance.now();
        }
      }
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && !isPaused) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price.replace(',', '.')) : price;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num || 0);
  };

  return (
      <motion.div 
        className={styles.storyOverlay}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {/* Progress Bars (One for each media of the CURRENT item) */}
        <div className={styles.progressContainer}>
          {mediaList.map((_, index) => (
            <div key={index} className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ 
                  width: index === currentMediaIndex 
                    ? `${progress}%` 
                    : index < currentMediaIndex ? '100%' : '0%',
                  transition: 'none'
                }} 
              />
            </div>
          ))}
        </div>

        {/* Header (Close Button) */}
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close stories">
            <X size={20} />
          </button>
        </div>

        {/* Background Image/Video or Placeholder */}
        <div className={styles.imageBackground}>
          {displayMedia ? (
            isVideo ? (
               <video 
                  ref={videoRef}
                  src={displayMedia} 
                  autoPlay 
                  muted 
                  playsInline
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleNext}
               />
            ) : (
               <img src={displayMedia} alt={currentItem.name} />
            )
          ) : (
            <div className={styles.placeholderBackground}>
               <ImageOff size={48} color="rgba(255,255,255,0.2)" strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Tap Zones for Navigation and Pause */}
        <div className={styles.contentArea}>
          <div 
            className={styles.tapZoneLeft} 
            onClick={handlePrev}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
          <div 
            className={styles.tapZoneRight} 
            onClick={handleNext}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
        </div>

        {/* Item Details Overlay */}
        <div className={styles.itemDetails}>
          <h2 className={styles.itemName}>{currentItem.name}</h2>
          {currentItem.description && (
            <p className={styles.itemDescription}>{currentItem.description}</p>
          )}
          <div className={styles.itemPrice}>
            {formatPrice(currentItem.price)}
          </div>
        </div>
      </motion.div>
  );
};

export default StoryViewer;
