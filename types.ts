export type TargetValue = 25 | 50 | 75 | 100;
export type GameMode = 'SINGLE' | 'MULTI_LOCAL';

export interface TargetEntity {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  dx: number;
  dy: number;
  value: TargetValue;
  radius: number; // visual size factor
  isHit?: boolean; // Flag for death animation (spin out)
}

export interface HitRecord {
  id: string;
  points: number;
  isBullseye: boolean;
  value: TargetValue | 0; // 0 represents a miss
  timestamp: number;
  totalScoreSnapshot: number; // Score after this shot
}

export interface PlayerSettings {
  nickname: string;
  nickname2?: string; // For Player 2
  customImage: string | null; // Base64 string of the uploaded image
  roundDuration: number; // Seconds per round
  maxAmmo: number; // Total shots available per round
  isUnlimitedAmmo: boolean; // Infinite ammo flag
  isUnlimitedTime: boolean; // Infinite time flag
  isTrainingMode: boolean; // Training mode flag
  gameMode: GameMode; // Single or Multiplayer
}

export interface PlayerState {
    id: number;
    name: string;
    totalScore: number;
    roundScore: number;
}

export interface GameState {
  isPlaying: boolean;
  shotsLeft: number;
  currentScore: number;
  totalScore: number;
  round: number;
  timeLeft: number; // Seconds remaining in current round
  totalTimePlayed: number; // Total seconds played across rounds in current session
  lastHit: {
    points: number;
    isBullseye: boolean;
    x: number;
    y: number;
  } | null;
  hitHistory: HitRecord[];
  playerSettings: PlayerSettings;
  
  // Multiplayer Specific
  activePlayerIndex: number; // 0 or 1
  players: PlayerState[]; 
  isTurnTransition: boolean; // Is the game waiting for player switch?
}

export interface Point {
  x: number;
  y: number;
}

export interface HighScore {
  score: number;
  name: string;
  date: string;
  shots: number; // Total shots fired
  time: number;  // Total time played in seconds
  sessionId?: string; // Unique ID for the current session to allow auto-updates
}