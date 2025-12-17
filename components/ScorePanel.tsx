import React from 'react';
import { GameState, TargetValue, HighScore } from '../types';
import { TARGET_CONFIG } from '../constants';
import { Trophy, Zap, Crosshair, User, Clock, Medal, BarChart2, Infinity, LogOut, Users } from 'lucide-react';

interface ScorePanelProps {
  gameState: GameState;
  highScores: HighScore[];
  onReset: () => void;
  onNextRound: () => void;
  onFinishGame: () => void;
  currentSessionId?: string; // New prop for identification
}

export const ScorePanel: React.FC<ScorePanelProps> = ({ gameState, highScores, onReset, onNextRound, onFinishGame, currentSessionId }) => {
  const isUnlimitedTime = gameState.playerSettings.isUnlimitedTime;
  const isUnlimitedAmmo = gameState.playerSettings.isUnlimitedAmmo;
  const isRoundOver = (gameState.shotsLeft === 0 && !isUnlimitedAmmo) || (!isUnlimitedTime && gameState.timeLeft === 0);
  const isMultiplayer = gameState.playerSettings.gameMode === 'MULTI_LOCAL';

  // Calculate Percentage for Time Bar
  const totalTime = gameState.playerSettings.roundDuration || 30;
  const timePercent = (gameState.timeLeft / totalTime) * 100;
  const isLowTime = gameState.timeLeft <= 5;

  // Stats Calculation
  const totalShots = gameState.hitHistory.length;
  // Avg score uses total shots as divisor
  const avgScore = totalShots > 0 ? (gameState.totalScore / totalShots).toFixed(1) : "0.0";
  const displayTotalShots = gameState.hitHistory.length;

  // Colors for Top 5 ranking
  const rankColors = [
      "text-yellow-400", // 1st - Gold
      "text-gray-300",   // 2nd - Silver
      "text-amber-600",  // 3rd - Bronze
      "text-blue-400",   // 4th
      "text-purple-400"  // 5th
  ];

  const showFinishButton = isUnlimitedAmmo || isUnlimitedTime;

  // --- Battle Log Rendering Logic ---
  const renderBattleLog = () => {
    const history = [...gameState.hitHistory].reverse();
    const renderedItems: React.ReactNode[] = [];
    let currentMissCount = 0;
    
    history.forEach((hit, index) => {
        const isMiss = hit.value === 0;
        
        if (isMiss) {
            currentMissCount++;
            const nextHit = history[index + 1]; 
            
            if (!nextHit || nextHit.value !== 0) {
                 renderedItems.push(
                    <div key={`miss-group-${hit.id}`} className="flex items-center justify-between bg-slate-800/30 p-1 rounded border border-white/5 animate-in slide-in-from-right fade-in duration-300">
                         <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full border border-white/10 flex items-center justify-center bg-slate-700/50">
                                <div className="w-1 h-1 bg-slate-500 rounded-full" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-500">
                                MISS
                            </span>
                         </div>
                         <span className="text-[9px] font-mono font-bold text-slate-600 bg-black/20 px-1 rounded">
                            x{currentMissCount}
                         </span>
                    </div>
                 );
                 currentMissCount = 0; // Reset counter
            }
        } else {
             renderedItems.push(
                <div key={hit.id} className="flex items-center justify-between bg-slate-800/50 p-1 rounded border border-white/5 animate-in slide-in-from-right fade-in duration-300">
                     <div className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full border border-white/20 flex items-center justify-center ${TARGET_CONFIG[hit.value as TargetValue].color}`}>
                            {hit.isBullseye && <div className="w-1 h-1 bg-black rounded-full" />}
                        </div>
                        <span className="text-[9px] font-bold text-slate-300">
                            {hit.value}
                        </span>
                     </div>
                     <span className={`text-[9px] font-mono font-bold ${hit.isBullseye ? 'text-red-400' : 'text-yellow-400'}`}>
                        +{hit.points}
                     </span>
                </div>
            );
        }
    });
    
    return renderedItems;
  };

  const activeP1 = isMultiplayer && gameState.activePlayerIndex === 0;
  const activeP2 = isMultiplayer && gameState.activePlayerIndex === 1;

  return (
    <div className="h-full w-full bg-slate-900 border-t-4 border-slate-700 flex flex-col shadow-inner overflow-hidden">
      
      {/* Content Area: Stats & Logs (Row) */}
      <div className="flex-1 flex flex-row gap-1 p-1 min-h-0 overflow-hidden">
        
        {/* Col 1: Stats & Scores */}
        <div className="flex flex-col w-1/2 gap-1 overflow-hidden">
            {/* User & Score Header */}
            <div className="shrink-0">
                <div className="flex flex-col">
                {/* Multiplayer VS Header */}
                {isMultiplayer ? (
                    <div className="flex items-center justify-between bg-black/30 rounded px-1 py-0.5 border border-white/10 mb-1">
                        <div className={`flex flex-col items-start ${activeP1 ? 'opacity-100' : 'opacity-40'}`}>
                            <span className="text-[8px] font-bold text-blue-400 uppercase">{gameState.players[0].name}</span>
                            <span className="text-xs font-black text-white">{gameState.players[0].totalScore}</span>
                        </div>
                        <div className="text-[8px] text-slate-600 font-black italic">VS</div>
                        <div className={`flex flex-col items-end ${activeP2 ? 'opacity-100' : 'opacity-40'}`}>
                            <span className="text-[8px] font-bold text-purple-400 uppercase">{gameState.players[1].name}</span>
                            <span className="text-xs font-black text-white">{gameState.players[1].totalScore}</span>
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 truncate mb-0.5">
                        <User size={10} /> {gameState.playerSettings.nickname}
                    </span>
                )}
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-yellow-400">
                        <Trophy size={16} />
                        <span className="text-xl font-black tracking-tighter">
                            {isMultiplayer ? gameState.currentScore : gameState.totalScore}
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">
                        {gameState.playerSettings.isTrainingMode ? (
                            <span className="text-green-500 animate-pulse">TRAINING</span>
                        ) : (
                            `Rnd ${gameState.round}`
                        )}
                    </div>
                </div>
                
                {/* Stats Bar */}
                <div className="flex items-center justify-between mt-0.5 px-1 py-0.5 bg-black/40 rounded border border-white/5">
                    <div className="flex items-center gap-1" title="Total Time Played">
                        <Clock size={8} className="text-slate-400"/>
                        <span className="text-[9px] font-mono text-slate-300">{gameState.totalTimePlayed}s</span>
                    </div>
                    <div className="h-2 w-[1px] bg-slate-700"></div>
                    <div className="flex items-center gap-1" title="Total Shots Fired">
                        <Crosshair size={8} className="text-slate-400"/>
                        <span className="text-[9px] font-mono text-slate-300">{displayTotalShots}</span>
                    </div>
                    <div className="h-2 w-[1px] bg-slate-700"></div>
                    <div className="flex items-center gap-1" title="Average Points Per Sniper Shot (No Rapid Fire)">
                        <BarChart2 size={8} className="text-slate-400"/>
                        <span className="text-[9px] font-mono text-yellow-500">{avgScore}</span>
                    </div>
                </div>
                </div>

                {/* Timer Bar */}
                <div className="mt-0.5 space-y-0.5">
                    <div className="flex justify-between items-center text-[9px] text-slate-300 font-bold uppercase">
                        <span className="flex items-center gap-1"><Clock size={9} /> Süre</span>
                        {isUnlimitedTime ? (
                            <span className="text-yellow-400"><Infinity size={12} /></span>
                        ) : (
                            <span className={`${isLowTime ? 'text-red-500 animate-pulse' : 'text-white'}`}>00:{gameState.timeLeft.toString().padStart(2, '0')}</span>
                        )}
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ease-linear ${isLowTime && !isUnlimitedTime ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: isUnlimitedTime ? '100%' : `${timePercent}%` }}
                        />
                    </div>
                </div>
            </div>
            
            {/* High Score List (Hidden in Multiplayer, or adapted) */}
            {!isMultiplayer ? (
            <div className="flex-1 bg-black/20 rounded border border-white/5 p-1 flex flex-col relative min-h-0">
                {gameState.playerSettings.isTrainingMode && (
                    <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center text-center p-2 backdrop-blur-[1px]">
                        <span className="text-[10px] text-green-400 font-bold uppercase border border-green-500/30 bg-green-900/40 px-2 py-1 rounded">
                            Scores disabled in Training
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-1 text-[8px] font-bold text-yellow-500/80 mb-1 border-b border-white/5 pb-0.5 uppercase tracking-wider justify-between shrink-0">
                    <span><Medal size={8} className="inline mr-1" /> EN İYİ 10</span>
                    <span className="text-[7px] text-slate-600">SÜRE</span>
                </div>
                {/* SAFE SCROLL CONTAINER using absolute inset-0 */}
                <div className="relative flex-1 min-h-0 w-full">
                    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-0.5">
                        {highScores.length === 0 ? (
                            <div className="text-[8px] text-slate-600 italic text-center py-2">No records yet</div>
                        ) : (
                            highScores.map((score, i) => {
                                const avg = (score.score / (score.shots || 1)).toFixed(1);
                                const rowColor = rankColors[i] || "text-slate-500";
                                const isCurrentPlayer = score.sessionId === currentSessionId;
                                
                                return (
                                    <div 
                                        key={i} 
                                        className={`
                                            flex justify-between items-center text-[9px] border-b last:border-0 py-0.5 w-full px-1 rounded
                                            ${isCurrentPlayer ? 'bg-yellow-900/30 border-yellow-500/50 animate-pulse' : 'border-white/5'}
                                        `}
                                    >
                                        <div className="flex items-center flex-1 truncate gap-1">
                                            <span className={`w-3 font-mono ${rowColor} font-bold`}>{i + 1}.</span>
                                            <div className="flex flex-col">
                                                <span className={`truncate max-w-[50px] leading-tight ${rowColor} ${isCurrentPlayer ? 'text-yellow-200' : ''}`}>
                                                    {score.name} {isCurrentPlayer && "(YOU)"}
                                                </span>
                                                <span className="text-[7px] text-slate-500 leading-tight font-mono">{score.score}p / {score.shots} atış</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`${rowColor} font-mono font-bold`} title="Average Score">{avg}Ø</span>
                                            <span className="text-slate-600 font-mono w-6 text-right" title="Total Time">({score.time}s)</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
            ) : (
                <div className="flex-1 bg-black/20 rounded border border-white/5 p-2 flex items-center justify-center text-center">
                    <div className="text-slate-500 text-[10px] font-bold uppercase">
                        {activeP1 ? "Sıra 1. Oyuncuda" : "Sıra 2. Oyuncuda"}
                    </div>
                </div>
            )}
        </div>

        {/* Col 2: Log */}
        <div className="flex flex-col w-1/2 bg-black/40 rounded border border-white/10 p-0.5 min-w-[120px] overflow-hidden">
            <div className="flex justify-between items-center mb-0.5 border-b border-white/10 pb-0.5 shrink-0">
                <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-1">
                    <Crosshair size={9} /> ATIŞ BİLGİLERİ
                </span>
            </div>
            
            <div className="relative flex-1 w-full bg-slate-900/50 rounded border border-white/5 overflow-hidden mt-0.5">
                <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-0.5 custom-scrollbar">
                    <div className="space-y-0.5">
                        {gameState.hitHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-1 opacity-50">
                                <Crosshair size={16} />
                                <span className="text-[9px] italic">No shots fired</span>
                            </div>
                        ) : (
                            renderBattleLog()
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Footer Controls Area */}
      <div className="shrink-0 bg-slate-950/90 p-2 border-t border-white/10 flex items-center justify-between gap-3 safe-area-pb">
            {isRoundOver ? (
                <button 
                    onClick={onNextRound}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse"
                >
                    {isMultiplayer ? (
                        activeP1 ? (
                            <>
                            <Users size={16} /> SIRAYI DEVRET
                            </>
                        ) : (
                            <>
                            <Users size={16} /> ROUND BİTİR
                            </>
                        )
                    ) : (
                        <>
                            <Zap size={16} /> SONRAKİ OYUN
                        </>
                    )}
                </button>
            ) : (
                <>
                    {/* Ammo Display (Left) */}
                    <div className="flex flex-col items-start gap-0.5 min-w-[60px]">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Mermi</span>
                        {isUnlimitedAmmo ? (
                            <div className="text-yellow-500 font-bold text-sm animate-pulse">
                                <Infinity size={18} />
                            </div>
                        ) : (
                            <div className="flex gap-0.5 items-center flex-wrap">
                                {Array.from({ length: gameState.playerSettings.maxAmmo }).map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`
                                    h-3 w-2 rounded-[1px] border border-slate-600 transform skew-x-12 transition-all duration-300
                                    ${i < gameState.shotsLeft ? 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.8)]' : 'bg-slate-800 opacity-30'}
                                    `}
                                />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Finish & Save Button (Right) - Only if unlimited mode enables it */}
                    {showFinishButton && (
                         <button 
                            onClick={onFinishGame}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded text-xs uppercase tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 border border-red-400"
                        >
                            <LogOut size={16} />
                            BİTİR & KAYDET
                        </button>
                    )}
                </>
            )}
      </div>
    </div>
  );
};