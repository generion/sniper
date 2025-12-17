import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TargetEntity, GameState, Point, TargetValue, HighScore, PlayerSettings } from '../types';
import { TARGET_CONFIG, MAX_SHOTS, BASE_SPEED, BULLSEYE_RATIO } from '../constants';
import { Target } from './Target';
import { Scope } from './Scope';
import { ScorePanel } from './ScorePanel';
import { playShootSound, playHitSound, playBullseyeSound, playEmptyClick } from '../utils/audio';
import { Settings, X, Upload, Save, User, Clock, Disc, Target as TargetIcon, Users, Play, Gift, ExternalLink } from 'lucide-react';

// Utility to generate random ID
const uuid = () => Math.random().toString(36).substr(2, 9);

// Offset for mobile touch to make scope visible above finger
const TOUCH_Y_OFFSET = 100;

// Ad Configuration
const AD_DAILY_CAP = 5;
const AD_CHANCE = 0.4; // 40% chance to show ad on game over

// Default settings constant
const DEFAULT_SETTINGS: PlayerSettings = {
  nickname: 'OYUNCU 1',
  nickname2: 'OYUNCU 2',
  customImage: null,
  roundDuration: 30,
  maxAmmo: MAX_SHOTS,
  isUnlimitedAmmo: false,
  isUnlimitedTime: false,
  isTrainingMode: false,
  gameMode: 'SINGLE'
};

// Helper to load settings from local storage
const loadSavedSettings = (): PlayerSettings => {
  try {
    const saved = localStorage.getItem('sniper_settings');
    if (saved) {
      // Merge saved settings with defaults to ensure all fields exist (in case of updates)
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load settings", e);
  }
  return DEFAULT_SETTINGS;
};

// Helper for Ad Tracking
const checkAdEligibility = (): boolean => {
    try {
        const today = new Date().toLocaleDateString();
        const stored = localStorage.getItem('sniper_ad_tracker');
        if (stored) {
            const data = JSON.parse(stored);
            if (data.date !== today) {
                // New day, reset
                localStorage.setItem('sniper_ad_tracker', JSON.stringify({ date: today, count: 0 }));
                return true;
            }
            return data.count < AD_DAILY_CAP;
        }
        // No data, init
        localStorage.setItem('sniper_ad_tracker', JSON.stringify({ date: today, count: 0 }));
        return true;
    } catch (e) {
        return true;
    }
};

const incrementAdCount = () => {
    try {
        const today = new Date().toLocaleDateString();
        const stored = localStorage.getItem('sniper_ad_tracker');
        let count = 0;
        if (stored) {
            const data = JSON.parse(stored);
            if (data.date === today) count = data.count;
        }
        localStorage.setItem('sniper_ad_tracker', JSON.stringify({ date: today, count: count + 1 }));
    } catch (e) {
        console.error(e);
    }
};

export const Game: React.FC = () => {
  // --- State ---
  // Initialize state using a function to load settings only once on mount
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialSettings = loadSavedSettings();
    
    return {
      isPlaying: true,
      shotsLeft: initialSettings.maxAmmo, // Use loaded max ammo
      currentScore: 0,
      totalScore: 0,
      round: 1,
      timeLeft: initialSettings.roundDuration, // Use loaded duration
      totalTimePlayed: 0,
      lastHit: null,
      hitHistory: [],
      playerSettings: initialSettings,
      activePlayerIndex: 0,
      players: [
          { id: 0, name: initialSettings.nickname, totalScore: 0, roundScore: 0 },
          { id: 1, name: initialSettings.nickname2 || 'OYUNCU 2', totalScore: 0, roundScore: 0 }
      ],
      isTurnTransition: false
    };
  });

  const [targets, setTargets] = useState<TargetEntity[]>([]);
  const [aimPosition, setAimPosition] = useState<Point | null>(null);
  
  // Track if user is holding down the mouse/touch (just for scope visibility now)
  const [isHolding, setIsHolding] = useState(false);
  
  // High Scores State
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  
  // Unique Session ID for Auto-Saving the current game
  const sessionIdRef = useRef(uuid());
  
  // Settings UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState(gameState.playerSettings);

  // Ad State
  const [showAd, setShowAd] = useState(false);
  const adTriggeredRef = useRef(false); // To prevent double firing in one round end
  const [sessionRewardActive, setSessionRewardActive] = useState(false);

  // Visual state for celebration text
  const [celebration, setCelebration] = useState<{ text: string, x: number, y: number, id: number } | null>(null);

  // --- Refs ---
  const requestRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetsRef = useRef<TargetEntity[]>([]); // Synced with state for loop logic
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aimPosRef = useRef<Point | null>(null); // For accessing aiming inside interval
  
  // Keep aimPosRef synced
  useEffect(() => {
    aimPosRef.current = aimPosition;
  }, [aimPosition]);

  // Load High Scores on Mount
  useEffect(() => {
    try {
        const stored = localStorage.getItem('sniper_highscores');
        if (stored) {
            setHighScores(JSON.parse(stored));
        }
    } catch (e) {
        console.error("Failed to load scores", e);
    }
  }, []);

  // Keep targetsRef in sync with targets state to avoid stale closures in loop
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  // --- Auto Save Logic (Only for Single Player currently) ---
  useEffect(() => {
    if (gameState.totalScore <= 0 || gameState.playerSettings.isTrainingMode || gameState.playerSettings.gameMode === 'MULTI_LOCAL') return;

    setHighScores(prevScores => {
        const normalShots = gameState.hitHistory.length || 1;
        
        const currentEntry: HighScore = {
            sessionId: sessionIdRef.current,
            score: gameState.totalScore,
            name: gameState.playerSettings.nickname,
            date: new Date().toLocaleDateString(),
            shots: normalShots, 
            time: gameState.totalTimePlayed || 1
        };

        const otherScores = prevScores.filter(s => s.sessionId !== sessionIdRef.current);
        const combinedScores = [...otherScores, currentEntry];

        const sorted = combinedScores
            .sort((a, b) => {
                const avgA = a.score / (a.shots || 1);
                const avgB = b.score / (b.shots || 1);
                if (Math.abs(avgA - avgB) > 0.01) { 
                    return avgB - avgA;
                }
                return (a.time || 999) - (b.time || 999);
            }) 
            .slice(0, 10); // INCREASED TO TOP 10 to allow seeing more history

        localStorage.setItem('sniper_highscores', JSON.stringify(sorted));
        return sorted;
    });

  }, [gameState.totalScore, gameState.hitHistory, gameState.totalTimePlayed, gameState.playerSettings.nickname, gameState.playerSettings.isTrainingMode, gameState.playerSettings.gameMode]);


  // --- Ad Logic ---
  useEffect(() => {
      // Check if game is over (Time out OR Ammo out)
      const isUnlimitedTime = gameState.playerSettings.isUnlimitedTime;
      const isUnlimitedAmmo = gameState.playerSettings.isUnlimitedAmmo;
      
      const isTimeOut = !isUnlimitedTime && gameState.timeLeft === 0;
      const isAmmoOut = !isUnlimitedAmmo && gameState.shotsLeft === 0;

      if ((isTimeOut || isAmmoOut) && !gameState.isTurnTransition && !isSettingsOpen) {
          if (!adTriggeredRef.current) {
              adTriggeredRef.current = true;
              
              // Only trigger if we don't already have the reward and rng passes
              if (!sessionRewardActive && Math.random() < AD_CHANCE) {
                   if (checkAdEligibility()) {
                       setTimeout(() => {
                           setShowAd(true);
                           incrementAdCount();
                       }, 500); // Slight delay after game over
                   }
              }
          }
      } else {
          // Reset trigger when game is running
          if (!isTimeOut && !isAmmoOut) {
            adTriggeredRef.current = false;
          }
      }
  }, [gameState.timeLeft, gameState.shotsLeft, gameState.playerSettings.isUnlimitedTime, gameState.playerSettings.isUnlimitedAmmo, gameState.isTurnTransition, isSettingsOpen, sessionRewardActive]);

  const handleAdClick = () => {
      // User clicked the ad -> Enable session rewards
      setSessionRewardActive(true);
      setShowAd(false);
      
      setGameState(prev => ({
          ...prev,
          playerSettings: {
              ...prev.playerSettings,
              isUnlimitedAmmo: true,
              isUnlimitedTime: true
          },
          // Give them a fresh start immediately for this round if they want, 
          // OR usually they would click "Next Game". 
          // Let's just update settings, the user will see infinity icons update.
      }));

      // Celebration for reward
      setCelebration({ text: "ÖDÜL AKTİF!", x: window.innerWidth / 2, y: window.innerHeight / 2, id: Date.now() });
      setTimeout(() => setCelebration(null), 2000);
  };

  const handleAdClose = () => {
      setShowAd(false);
  };


  // --- Settings Handlers ---
  const handleOpenSettings = () => {
    setTempSettings(gameState.playerSettings);
    setIsSettingsOpen(true);
    setAimPosition(null); // Release scope if open
  };

  const handleSaveSettings = () => {
    // SAVE SETTINGS TO LOCAL STORAGE
    try {
      localStorage.setItem('sniper_settings', JSON.stringify(tempSettings));
    } catch (e) {
      console.error("Failed to save settings", e);
    }

    // Check if critical settings changed to reset game
    const isModeChanged = tempSettings.gameMode !== gameState.playerSettings.gameMode;
    const isP1NameChanged = tempSettings.nickname !== gameState.playerSettings.nickname;
    const isP2NameChanged = tempSettings.nickname2 !== gameState.playerSettings.nickname2;

    if (isModeChanged || isP1NameChanged || isP2NameChanged) {
        sessionIdRef.current = uuid();
        
        setGameState(prev => ({
            ...prev,
            currentScore: 0,
            totalScore: 0,
            round: 1,
            shotsLeft: tempSettings.maxAmmo,
            timeLeft: tempSettings.roundDuration,
            totalTimePlayed: 0,
            hitHistory: [],
            lastHit: null,
            playerSettings: tempSettings,
            activePlayerIndex: 0, // Reset to Player 1
            players: [
                { id: 0, name: tempSettings.nickname, totalScore: 0, roundScore: 0 },
                { id: 1, name: tempSettings.nickname2 || 'OYUNCU 2', totalScore: 0, roundScore: 0 }
            ],
            isTurnTransition: false
        }));
        setTargets([]);
        setIsSettingsOpen(false);
        return;
    }

    // Normal save
    setGameState(prev => ({
      ...prev,
      playerSettings: tempSettings,
    }));
    
    if (tempSettings.isTrainingMode !== gameState.playerSettings.isTrainingMode) {
        setTargets([]);
    }

    setIsSettingsOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempSettings(prev => ({ ...prev, customImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Timer Logic ---
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const isUnlimited = gameState.playerSettings.isUnlimitedAmmo;
    const isUnlimitedTime = gameState.playerSettings.isUnlimitedTime;
    const canPlay = isUnlimited || gameState.shotsLeft > 0;

    // Pause timer during settings or turn transitions or ad
    if (isSettingsOpen || gameState.isTurnTransition || showAd || !canPlay || (!isUnlimitedTime && gameState.timeLeft <= 0)) {
        if (!canPlay) return;
    }

    if (isSettingsOpen || gameState.isTurnTransition || showAd) return;

    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.playerSettings.isUnlimitedTime) {
           return { ...prev, totalTimePlayed: prev.totalTimePlayed + 1 };
        }

        if (prev.timeLeft <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return { ...prev, timeLeft: 0, totalTimePlayed: prev.totalTimePlayed + 1 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1, totalTimePlayed: prev.totalTimePlayed + 1 };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.isPlaying, gameState.shotsLeft, isSettingsOpen, gameState.round, gameState.playerSettings.isUnlimitedAmmo, gameState.playerSettings.isUnlimitedTime, gameState.isTurnTransition, showAd]);


  // --- Game Loop Logic ---
  
  const spawnTarget = useCallback(() => {
    const values: TargetValue[] = [25, 50, 75, 100];
    const value = values[Math.floor(Math.random() * values.length)];
    const config = TARGET_CONFIG[value];
    
    let speed = 0;
    
    if (gameState.playerSettings.isTrainingMode) {
        speed = BASE_SPEED * 0.15; 
    } else {
        const roundSpeedMultiplier = 1 + ((gameState.round - 1) * 0.3);
        speed = (BASE_SPEED * 0.8) * roundSpeedMultiplier;
    }
    
    const angle = Math.random() * 2 * Math.PI;

    const newTarget: TargetEntity = {
      id: uuid(),
      x: Math.random() * 80 + 10, 
      y: Math.random() * 80 + 10,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      value: value,
      radius: config.radiusPx,
    };

    setTargets(prev => [...prev, newTarget]);
  }, [gameState.round, gameState.playerSettings.isTrainingMode]);

  const updatePositions = useCallback(() => {
    setTargets(prevTargets => {
      return prevTargets.map(t => {
        // If dying, don't move it
        if (t.isHit) return t; 

        let nextX = t.x + t.dx;
        let nextY = t.y + t.dy;

        if (nextX <= 5 || nextX >= 95) {
          t.dx *= -1;
          nextX = Math.max(5, Math.min(95, nextX));
        }
        if (nextY <= 5 || nextY >= 95) {
          t.dy *= -1;
          nextY = Math.max(5, Math.min(95, nextY));
        }

        return { ...t, x: nextX, y: nextY };
      });
    });
  }, []);

  const loop = useCallback(() => {
    const isUnlimited = gameState.playerSettings.isUnlimitedAmmo;
    const isUnlimitedTime = gameState.playerSettings.isUnlimitedTime;
    
    // Pause loop during transitions
    if ((isUnlimited || gameState.shotsLeft > 0) && (isUnlimitedTime || gameState.timeLeft > 0) && !isSettingsOpen && !gameState.isTurnTransition && !showAd) {
      updatePositions();
      
      const isTraining = gameState.playerSettings.isTrainingMode;
      // Filter out hit targets from the count so we spawn new ones while old ones are animating
      const activeTargetsCount = targetsRef.current.filter(t => !t.isHit).length;
      const maxTargets = isTraining ? 1 : 3;

      if (activeTargetsCount < maxTargets) {
        if (isTraining) {
             spawnTarget();
        } else if (Math.random() < 0.02) {
             spawnTarget();
        }
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState.shotsLeft, gameState.timeLeft, spawnTarget, updatePositions, isSettingsOpen, gameState.playerSettings.isTrainingMode, gameState.playerSettings.isUnlimitedAmmo, gameState.playerSettings.isUnlimitedTime, gameState.isTurnTransition, showAd]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  // --- Shooting Logic ---

  const triggerShot = useCallback(() => {
    if (isSettingsOpen || gameState.isTurnTransition || showAd) return;
    
    const currentAim = aimPosRef.current;
    if (!currentAim || !containerRef.current) return;

    const isUnlimited = gameState.playerSettings.isUnlimitedAmmo;
    const isUnlimitedTime = gameState.playerSettings.isUnlimitedTime;
    
    const hasAmmo = isUnlimited || gameState.shotsLeft > 0;
    
    // Check constraints
    if (!hasAmmo || (!isUnlimitedTime && gameState.timeLeft <= 0)) {
       playEmptyClick();
       return;
    }

    playShootSound();

    const elements = document.elementsFromPoint(currentAim.x, currentAim.y);
    const targetElement = elements.find(el => el.getAttribute('data-target-id'));

    let hitTargetId: string | null = null;
    let pointsAwarded = 0;
    let isBullseye = false;
    let hitValue: TargetValue | 0 = 0;
    let spawnedTargets: TargetEntity[] = [];
    let ammoBonus = 0;

    if (targetElement) {
        hitTargetId = targetElement.getAttribute('data-target-id');
        
        // Double check against state to ensure we don't hit an already dying target
        const hitTargetObj = targetsRef.current.find(t => t.id === hitTargetId);
        
        if (hitTargetObj && !hitTargetObj.isHit) {
            const value = parseInt(targetElement.getAttribute('data-target-value') || '0') as TargetValue;
            hitValue = value;

            const rect = targetElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const dist = Math.sqrt(Math.pow(currentAim.x - centerX, 2) + Math.pow(currentAim.y - centerY, 2));
            
            if (dist <= (rect.width / 2) * BULLSEYE_RATIO) {
                isBullseye = true;
                pointsAwarded = value * 2;
            } else {
                pointsAwarded = value;
            }

            const isTraining = gameState.playerSettings.isTrainingMode;

            if (isBullseye && hitTargetId) {
                if (hitValue === 100) {
                   if (!isUnlimited) {
                       ammoBonus = 2; // Add 2 bullets bonus
                   }
                } 
                else if (!isTraining) {
                    let nextValue: TargetValue | null = null;
                    if (hitValue === 25) nextValue = 50;
                    else if (hitValue === 50) nextValue = 75;
                    else if (hitValue === 75) nextValue = 100;

                    if (nextValue) {
                        const nextConfig = TARGET_CONFIG[nextValue];
                        for(let i = 0; i < 3; i++) {
                            const angle = (Math.PI * 2 / 3) * i + Math.random();
                            const speed = BASE_SPEED * 1.5;
                            spawnedTargets.push({
                                id: uuid(),
                                x: hitTargetObj.x,
                                y: hitTargetObj.y,
                                dx: Math.cos(angle) * speed,
                                dy: Math.sin(angle) * speed,
                                value: nextValue,
                                radius: nextConfig.radiusPx
                            });
                        }
                    }
                }
            }
        } else {
            // Target was already hit or not found in state
            hitTargetId = null;
        }
    }

    const shouldConsumeAmmo = !isUnlimited;

    if (hitTargetId) {
       if (isBullseye) {
           playBullseyeSound();
           if (hitValue === 100 && ammoBonus > 0) {
               setCelebration({ text: "+2 MERMİ!", x: currentAim.x, y: currentAim.y, id: Date.now() });
               setTimeout(() => setCelebration(null), 1000);
           } else if (hitValue !== 100) { 
              setCelebration({ text: spawnedTargets.length > 0 ? "SPLIT x3!" : "PERFECT SHOT!", x: currentAim.x, y: currentAim.y, id: Date.now() });
              setTimeout(() => setCelebration(null), 1000);
           }
       } else {
           playHitSound();
       }

       // Update Targets Logic - UNIFIED FOR ALL HITS (BULLSEYE OR NORMAL)
       // 1. Mark target as hit (triggers spin animation)
       // 2. Add any spawned targets immediately
       // 3. Remove hit target after delay
       setTargets(prev => {
            const updatedTargets = prev.map(t => 
                t.id === hitTargetId ? { ...t, isHit: true } : t
            );
            return [...updatedTargets, ...spawnedTargets];
       });
       
       // Delayed removal after animation (500ms match css)
       setTimeout(() => {
            setTargets(prev => prev.filter(t => t.id !== hitTargetId));
       }, 500);
       
       setGameState(prev => {
          const newCurrentScore = prev.currentScore + pointsAwarded;
          
          // Update Current Player Stats immediately
          const updatedPlayers = [...prev.players];
          const activeIdx = prev.activePlayerIndex;
          updatedPlayers[activeIdx] = {
              ...updatedPlayers[activeIdx],
              totalScore: updatedPlayers[activeIdx].totalScore + pointsAwarded,
              roundScore: updatedPlayers[activeIdx].roundScore + pointsAwarded
          };

          return {
            ...prev,
            // Consumes 1 ammo if not unlimited, but adds ammoBonus (2) if earned. Net +1 if bonus earned.
            shotsLeft: (shouldConsumeAmmo ? prev.shotsLeft - 1 : prev.shotsLeft) + ammoBonus,
            currentScore: newCurrentScore,
            totalScore: prev.totalScore + pointsAwarded,
            players: updatedPlayers,
            lastHit: { points: pointsAwarded / (isBullseye ? 2 : 1), isBullseye, x: currentAim.x, y: currentAim.y },
            hitHistory: [...prev.hitHistory, {
                id: uuid(),
                points: pointsAwarded,
                isBullseye,
                value: hitValue,
                timestamp: Date.now(),
                totalScoreSnapshot: prev.currentScore + pointsAwarded
            }]
          };
      });
    } else {
        // Miss
        setGameState(prev => {
            return {
                ...prev,
                shotsLeft: shouldConsumeAmmo ? prev.shotsLeft - 1 : prev.shotsLeft,
                lastHit: null,
                hitHistory: [...prev.hitHistory, {
                id: uuid(),
                points: 0,
                isBullseye: false,
                value: 0,
                timestamp: Date.now(),
                totalScoreSnapshot: prev.currentScore
                }]
            };
        });
    }
  }, [gameState.shotsLeft, gameState.timeLeft, isSettingsOpen, gameState.isTurnTransition, gameState.playerSettings.isTrainingMode, gameState.playerSettings.isUnlimitedAmmo, gameState.playerSettings.isUnlimitedTime, showAd]);


  // --- Interaction Logic ---

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isSettingsOpen || gameState.isTurnTransition || showAd) return; 
    
    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const targetY = isTouch ? clientY - TOUCH_Y_OFFSET : clientY;

    setAimPosition({ x: clientX, y: targetY });
    setIsHolding(true);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isHolding && !aimPosition) return;
    
    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const targetY = isTouch ? clientY - TOUCH_Y_OFFSET : clientY;

    setAimPosition({ x: clientX, y: targetY });
  };

  const handlePointerUp = () => {
    setIsHolding(false);
    triggerShot();
    setAimPosition(null);
  };

  // --- Game Flow (Next Round / Next Turn) ---

  const handleNextAction = () => {
      const isMultiplayer = gameState.playerSettings.gameMode === 'MULTI_LOCAL';

      if (isMultiplayer) {
          // If Player 1 just finished, switch to Player 2
          if (gameState.activePlayerIndex === 0) {
              setGameState(prev => ({
                  ...prev,
                  activePlayerIndex: 1,
                  isTurnTransition: true, // Wait for user to tap start
                  // Reset round specific stats
                  shotsLeft: prev.playerSettings.maxAmmo,
                  timeLeft: prev.playerSettings.roundDuration,
                  currentScore: 0,
                  hitHistory: [],
                  lastHit: null
              }));
              setTargets([]);
          } else {
              // Player 2 finished -> End of Round, Go to Next Round (back to P1)
              setGameState(prev => ({
                  ...prev,
                  activePlayerIndex: 0,
                  isTurnTransition: true,
                  round: prev.round + 1,
                  shotsLeft: prev.playerSettings.maxAmmo,
                  timeLeft: prev.playerSettings.roundDuration,
                  currentScore: 0,
                  hitHistory: [],
                  lastHit: null
              }));
              setTargets([]);
          }
      } else {
          // Single Player - Just Next Round
          setGameState(prev => ({
              ...prev,
              shotsLeft: prev.playerSettings.maxAmmo,
              currentScore: 0,
              round: prev.round + 1,
              timeLeft: prev.playerSettings.roundDuration, 
              lastHit: null,
              hitHistory: [] 
          }));
          setTargets([]); 
      }
  };
  
  const startTurn = () => {
      setGameState(prev => ({ ...prev, isTurnTransition: false }));
  };
  
  const handleFinishGame = () => {
      setGameState(prev => ({
          ...prev,
          shotsLeft: 0,
          timeLeft: 0,
          playerSettings: {
              ...prev.playerSettings,
              isUnlimitedAmmo: false,
              isUnlimitedTime: false
          }
      }));
  };

  const currentPlayerName = gameState.players[gameState.activePlayerIndex].name;
  const isMultiplayer = gameState.playerSettings.gameMode === 'MULTI_LOCAL';

  return (
    <div className="flex flex-col h-full w-full select-none">
      
      {/* Settings Button */}
      <div className="absolute top-4 left-4 z-50">
        <button 
            onClick={handleOpenSettings}
            className="bg-black/50 p-2 rounded-full border border-white/20 text-white hover:bg-black/80 transition-all active:scale-95"
        >
            <Settings size={24} />
        </button>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                      <X size={24} />
                  </button>
                  
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <Settings className="text-yellow-500" /> Ayarlar
                  </h2>

                  <div className="space-y-6">
                      {/* Game Mode Toggle */}
                      <div className="bg-slate-800 p-3 rounded border border-slate-700 space-y-3">
                           <label className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                             <Users size={16} className="text-blue-400" /> Oyun Modu
                          </label>
                          <div className="flex gap-2">
                              <button 
                                onClick={() => setTempSettings(prev => ({...prev, gameMode: 'SINGLE'}))}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded border transition-all ${tempSettings.gameMode === 'SINGLE' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                              >
                                  Tek Kişilik
                              </button>
                              <button 
                                onClick={() => setTempSettings(prev => ({...prev, gameMode: 'MULTI_LOCAL', isTrainingMode: false}))}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded border transition-all ${tempSettings.gameMode === 'MULTI_LOCAL' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                              >
                                  2 Kişilik (VS)
                              </button>
                          </div>
                      </div>

                      {/* Nickname Inputs */}
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                             <User size={16} /> Oyuncu İsimleri
                          </label>
                          <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={tempSettings.nickname}
                                onChange={(e) => setTempSettings(prev => ({...prev, nickname: e.target.value}))}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-mono focus:border-yellow-500 focus:outline-none"
                                placeholder="P1 Name"
                                maxLength={10}
                            />
                            {tempSettings.gameMode === 'MULTI_LOCAL' && (
                                <input 
                                    type="text" 
                                    value={tempSettings.nickname2 || ''}
                                    onChange={(e) => setTempSettings(prev => ({...prev, nickname2: e.target.value}))}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-mono focus:border-purple-500 focus:outline-none animate-in fade-in slide-in-from-right"
                                    placeholder="P2 Name"
                                    maxLength={10}
                                />
                            )}
                          </div>
                      </div>

                      {/* Training Mode Toggle (Only for Single Player) */}
                      {tempSettings.gameMode === 'SINGLE' && (
                        <div className="bg-slate-800 p-3 rounded border border-slate-700 flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <TargetIcon size={16} className="text-green-400" /> Antreman Modu
                            </label>
                            <div 
                                onClick={() => setTempSettings(prev => ({...prev, isTrainingMode: !prev.isTrainingMode}))}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${tempSettings.isTrainingMode ? 'bg-green-500' : 'bg-slate-600'}`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${tempSettings.isTrainingMode ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>
                      )}

                      {/* Timer Setting */}
                      <div className="space-y-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                           <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={16} /> Süre (Round)
                                </label>
                                
                                <div 
                                    onClick={() => setTempSettings(prev => ({...prev, isUnlimitedTime: !prev.isUnlimitedTime}))}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <span className={`text-[10px] font-bold uppercase ${tempSettings.isUnlimitedTime ? 'text-yellow-400' : 'text-slate-500'}`}>Sınırsız</span>
                                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${tempSettings.isUnlimitedTime ? 'bg-yellow-500' : 'bg-slate-600'}`}>
                                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${tempSettings.isUnlimitedTime ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                           </div>

                          <div className={`space-y-2 transition-opacity duration-300 ${tempSettings.isUnlimitedTime ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                              <div className="flex justify-between text-xs font-mono text-slate-500">
                                <span>Süre</span>
                                <span className="text-white font-bold">{tempSettings.roundDuration}s</span>
                              </div>
                              <input 
                                type="range" 
                                min="10" 
                                max="60" 
                                step="5"
                                disabled={tempSettings.isUnlimitedTime}
                                value={tempSettings.roundDuration}
                                onChange={(e) => setTempSettings(prev => ({...prev, roundDuration: parseInt(e.target.value)}))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                              />
                          </div>
                      </div>

                      {/* Ammo Setting */}
                      <div className="space-y-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                           <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Disc size={16} /> Mermi Ayarı
                                </label>
                                
                                <div 
                                    onClick={() => setTempSettings(prev => ({...prev, isUnlimitedAmmo: !prev.isUnlimitedAmmo}))}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <span className={`text-[10px] font-bold uppercase ${tempSettings.isUnlimitedAmmo ? 'text-yellow-400' : 'text-slate-500'}`}>Sınırsız</span>
                                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${tempSettings.isUnlimitedAmmo ? 'bg-yellow-500' : 'bg-slate-600'}`}>
                                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${tempSettings.isUnlimitedAmmo ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                           </div>

                          <div className={`space-y-2 transition-opacity duration-300 ${tempSettings.isUnlimitedAmmo ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                              <div className="flex justify-between text-xs font-mono text-slate-500">
                                <span>Limit</span>
                                <span className="text-white font-bold">{tempSettings.maxAmmo} Rounds</span>
                              </div>
                              <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1"
                                disabled={tempSettings.isUnlimitedAmmo}
                                value={tempSettings.maxAmmo}
                                onChange={(e) => setTempSettings(prev => ({...prev, maxAmmo: parseInt(e.target.value)}))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                              />
                          </div>
                      </div>

                      {/* Image Upload */}
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                             <Upload size={16} /> Hedef Görseli
                          </label>
                          <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 overflow-hidden relative flex-shrink-0">
                                  {tempSettings.customImage ? (
                                      <img src={tempSettings.customImage} className="w-full h-full object-cover" alt="Preview" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs text-center p-1">No Image</div>
                                  )}
                              </div>
                              
                              <label className="flex-1 cursor-pointer">
                                  <div className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded border border-slate-600 text-sm text-center transition-colors">
                                      Resim Seç...
                                  </div>
                                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                              </label>

                               {tempSettings.customImage && (
                                  <button 
                                    onClick={() => setTempSettings(prev => ({...prev, customImage: null}))}
                                    className="p-2 text-red-400 hover:bg-slate-800 rounded"
                                  >
                                      <X size={20} />
                                  </button>
                               )}
                          </div>
                      </div>
                  </div>

                  <button 
                    onClick={handleSaveSettings}
                    className="w-full mt-8 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                      <Save size={18} /> Kaydet
                  </button>
              </div>
          </div>
      )}
      
      {/* Turn Transition Overlay */}
      {gameState.isTurnTransition && !isSettingsOpen && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center flex-col p-6 text-center">
              <div className="mb-8">
                  <div className="text-slate-400 text-lg uppercase tracking-widest mb-2 font-bold">Sıra Diğer Oyuncuda</div>
                  <h1 className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                     {gameState.players[gameState.activePlayerIndex].name}
                  </h1>
              </div>
              
              <div className="w-64 h-64 relative mb-8 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ping opacity-20"></div>
                  <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                  <Users size={64} className="text-white" />
              </div>

              <button 
                onClick={startTurn}
                className="bg-green-600 hover:bg-green-500 text-white text-xl font-bold py-4 px-12 rounded-full shadow-[0_0_20px_rgba(22,163,74,0.6)] animate-pulse flex items-center gap-3 transition-transform active:scale-95"
              >
                  <Play size={24} fill="currentColor" /> BAŞLA
              </button>
          </div>
      )}

      {/* Ad Modal */}
      {showAd && (
          <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-yellow-500/50 w-full max-w-sm rounded-xl p-1 shadow-[0_0_50px_rgba(234,179,8,0.2)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  
                  {/* Badge */}
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-lg">
                      SPONSORLU BAĞLANTI
                  </div>

                  <div className="p-6 flex flex-col items-center text-center space-y-4">
                      <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/30 mb-2 relative">
                          <Gift size={40} className="text-yellow-400 animate-bounce" />
                          <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-ping opacity-20"></div>
                      </div>

                      <div>
                          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-1">
                              ÖZEL TEKLİF!
                          </h2>
                          <p className="text-slate-300 text-sm leading-relaxed">
                              Keskin nişancı yeteneklerini bir üst seviyeye taşı. Bu reklama tıklayarak bu oturum boyunca sınırsız güce eriş!
                          </p>
                      </div>

                      <div className="flex flex-col gap-2 w-full pt-2">
                          <button 
                            onClick={handleAdClick}
                            className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black py-3 px-4 rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide group"
                          >
                              <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform" />
                              Ödülü Al: Sınırsız Mod
                          </button>
                          
                          <button 
                            onClick={handleAdClose}
                            className="text-slate-500 hover:text-white text-xs font-bold py-2 transition-colors uppercase"
                          >
                              Hayır, Teşekkürler
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Game Area (1/2) */}
      <div 
        ref={containerRef}
        className="relative flex-grow-[1] basis-0 bg-gray-900 overflow-hidden touch-none cursor-crosshair z-0"
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => {
            setAimPosition(null);
            setIsHolding(false);
        }}
      >
        <div 
          className="w-full h-full absolute inset-0 transition-transform duration-75 ease-out will-change-transform"
          style={{
             transformOrigin: aimPosition ? `${aimPosition.x}px ${aimPosition.y}px` : 'center center',
             transform: aimPosition ? 'scale(2.5)' : 'scale(1)',
          }}
        >
            <div className="absolute inset-0 opacity-30 pointer-events-none" 
                style={{ 
                backgroundImage: 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)',
                backgroundSize: '40px 40px'
                }} 
            />
            {targets.map(target => (
            <Target key={target.id} target={target} customImage={gameState.playerSettings.customImage} />
            ))}
        </div>

        {!isSettingsOpen && !gameState.isTurnTransition && !showAd && <Scope position={aimPosition} />}

        {celebration && (
            <div 
                className="fixed z-50 pointer-events-none text-center"
                style={{ left: celebration.x, top: celebration.y - 100, transform: 'translate(-50%, -50%)' }}
            >
                <div className="text-3xl font-black text-yellow-300 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] animate-bounce tracking-tighter border-4 border-black p-2 bg-red-600 rotate-[-12deg]">
                    {celebration.text}
                </div>
            </div>
        )}

        {((gameState.shotsLeft === 0 && !gameState.playerSettings.isUnlimitedAmmo) || (!gameState.playerSettings.isUnlimitedTime && gameState.timeLeft === 0)) && !isSettingsOpen && !gameState.isTurnTransition && !showAd && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none backdrop-blur-[2px] z-40">
                <div className="flex flex-col items-center">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg transform -rotate-12 border-4 border-white p-4 mb-2">
                        {gameState.timeLeft === 0 ? "SÜRE BİTTİ" : "MERMİN BİTTİ"}
                    </h1>
                    {isMultiplayer && (
                        <div className="text-yellow-400 font-bold bg-black/80 px-4 py-1 rounded border border-yellow-400/50">
                            {currentPlayerName} Skor: {gameState.currentScore}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Score Panel (1/2) */}
      <div className="flex-grow-[1] basis-0 z-10 relative overflow-hidden min-h-0">
        <ScorePanel 
          gameState={gameState} 
          highScores={highScores}
          onReset={() => {}} 
          onNextRound={handleNextAction}
          onFinishGame={handleFinishGame}
          currentSessionId={sessionIdRef.current}
        />
      </div>
    </div>
  );
};