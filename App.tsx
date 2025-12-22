import React, { useState, useCallback, useEffect, useRef } from 'react';
import MagicCanvas from './components/MagicCanvas';
import { GameState, Spell, SpellType } from './types';
import { Flame, Shield, Zap, Info, Skull, Heart, Settings, Maximize, Minimize, FlipHorizontal, Snowflake, PlusSquare, Scroll } from 'lucide-react';

const COOLDOWNS: Record<SpellType, number> = {
  [SpellType.NONE]: 0,
  [SpellType.FIREBALL]: 1000,
  [SpellType.SHIELD]: 8000,
  [SpellType.LIGHTNING]: 5000,
  [SpellType.HEAL]: 12000,
  [SpellType.FROSTBOLT]: 500,
};

interface EnemyLogEntry {
    id: string;
    text: string;
    type: 'attack' | 'info';
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [spellLog, setSpellLog] = useState<Spell[]>([]);
  const [enemyLog, setEnemyLog] = useState<EnemyLogEntry[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  
  // Settings
  const [isMirrored, setIsMirrored] = useState(true); 
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('contain'); 
  const [showSettings, setShowSettings] = useState(false);

  // Duel State
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [isPlayerShielded, setIsPlayerShielded] = useState(false);
  const [enemyStatus, setEnemyStatus] = useState("Waiting...");
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSS' | null>(null);
  
  // Cooldown State
  const [lastCastTimes, setLastCastTimes] = useState<Record<string, number>>({});
  const [cooldownProgress, setCooldownProgress] = useState<Record<string, number>>({}); 

  const isPlayerShieldedRef = useRef(false);
  const gameOverRef = useRef(false);

  useEffect(() => {
    isPlayerShieldedRef.current = isPlayerShielded;
  }, [isPlayerShielded]);

  useEffect(() => {
    if (playerHp <= 0) {
      setGameResult('LOSS');
      gameOverRef.current = true;
    } else if (enemyHp <= 0) {
      setGameResult('WIN');
      gameOverRef.current = true;
    }
  }, [playerHp, enemyHp]);

  const triggerShake = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
  };

  const addEnemyLog = (text: string, type: 'attack' | 'info' = 'info') => {
      setEnemyLog(prev => [{id: Date.now().toString() + Math.random(), text, type}, ...prev].slice(0, 4));
  };

  // Cooldown Timer Loop
  useEffect(() => {
      const interval = setInterval(() => {
          const now = Date.now();
          const newProgress: Record<string, number> = {};
          
          Object.keys(COOLDOWNS).forEach(key => {
              const type = key as SpellType;
              if (type === SpellType.NONE) return;
              
              const lastCast = lastCastTimes[type] || 0;
              const elapsed = now - lastCast;
              const total = COOLDOWNS[type];
              
              if (elapsed < total) {
                  newProgress[type] = (elapsed / total) * 100;
              } else {
                  newProgress[type] = 100;
              }
          });
          setCooldownProgress(newProgress);
      }, 100);
      return () => clearInterval(interval);
  }, [lastCastTimes]);

  const handleSpellCast = useCallback((type: SpellType) => {
    if (gameOverRef.current) return;
    
    // Check Cooldown
    const now = Date.now();
    const lastCast = lastCastTimes[type] || 0;
    if (now - lastCast < COOLDOWNS[type]) {
        setEnemyStatus(`${getSpellName(type)} on Cooldown!`);
        return; 
    }

    setLastCastTimes(prev => ({...prev, [type]: now}));

    // Apply Effects
    let dmg = 0;
    let status = "";
    
    if (type === SpellType.FIREBALL) {
      dmg = 15;
      status = "Took 15 Damage!";
    } else if (type === SpellType.LIGHTNING) {
      dmg = 25;
      status = "CRITICAL HIT! (25)";
    } else if (type === SpellType.SHIELD) {
      setIsPlayerShielded(true);
      setTimeout(() => setIsPlayerShielded(false), 4000);
      status = "Shield Up!";
    } else if (type === SpellType.HEAL) {
      setPlayerHp(prev => Math.min(100, prev + 20));
      status = "Player Healed (+20)!";
    } else if (type === SpellType.FROSTBOLT) {
      dmg = 8;
      status = "Frozen! (8 Dmg)";
    }

    if (dmg > 0) {
        setEnemyHp(prev => Math.max(0, prev - dmg));
        setEnemyStatus(status);
        triggerShake();
    } else {
        setEnemyStatus(status);
    }

    const spellData: Spell = {
      id: Date.now().toString(),
      type,
      name: getSpellName(type),
      color: getSpellColor(type),
      icon: getSpellIconName(type),
      timestamp: Date.now(),
    };
    setSpellLog((prev) => [spellData, ...prev].slice(0, 5));
  }, [lastCastTimes]);

  useEffect(() => {
    if (gameOverRef.current) return;

    const interval = setInterval(() => {
      if (gameOverRef.current) return;
      const actionRoll = Math.random();
      
      if (actionRoll < 0.4) {
        setEnemyStatus("Casting Shadow Bolt!");
        addEnemyLog("Casting Shadow Bolt...", 'info');
        
        setTimeout(() => {
          if (gameOverRef.current) return;
          if (isPlayerShieldedRef.current) {
             setEnemyStatus("Attack Blocked!");
             addEnemyLog("Attack Blocked by Shield!", 'info');
          } else {
             setPlayerHp(prev => Math.max(0, prev - 10));
             setEnemyStatus("Shadow Bolt Hit You!");
             addEnemyLog("Shadow Bolt: -10 HP", 'attack');
             triggerShake();
          }
        }, 1500);
      } else if (actionRoll < 0.7) {
        setEnemyStatus("Gathering Dark Energy...");
        addEnemyLog("Gathering Energy...", 'info');
      } else {
        setEnemyStatus("Fast Strike!");
        setTimeout(() => {
             if (gameOverRef.current) return;
             if (isPlayerShieldedRef.current) {
                setEnemyStatus("Strike Deflected!");
             } else {
                setPlayerHp(prev => Math.max(0, prev - 5));
                addEnemyLog("Fast Strike: -5 HP", 'attack');
             }
        }, 800);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const resetGame = () => {
    setPlayerHp(100);
    setEnemyHp(100);
    setGameResult(null);
    setSpellLog([]);
    setEnemyLog([]);
    gameOverRef.current = false;
    setEnemyStatus("Waiting...");
    setLastCastTimes({});
  };

  const getSpellName = (type: SpellType) => {
    switch (type) {
      case SpellType.FIREBALL: return "Fireball";
      case SpellType.SHIELD: return "Arcane Shield";
      case SpellType.LIGHTNING: return "Lightning Bolt";
      case SpellType.HEAL: return "Restoration";
      case SpellType.FROSTBOLT: return "Frostbolt";
      default: return "Fizzle";
    }
  };

  const getSpellColor = (type: SpellType) => {
     switch (type) {
      case SpellType.FIREBALL: return "text-orange-500";
      case SpellType.SHIELD: return "text-green-400";
      case SpellType.LIGHTNING: return "text-yellow-400";
      case SpellType.HEAL: return "text-emerald-300";
      case SpellType.FROSTBOLT: return "text-cyan-300";
      default: return "text-gray-400";
    }
  };

  const getSpellIconName = (type: SpellType) => {
      switch(type) {
          case SpellType.FIREBALL: return 'flame';
          case SpellType.SHIELD: return 'shield';
          case SpellType.LIGHTNING: return 'zap';
          case SpellType.HEAL: return 'heart';
          case SpellType.FROSTBOLT: return 'snowflake';
          default: return 'info';
      }
  }

  const getStatusText = () => {
    switch (gameState) {
      case GameState.DRAWING: return "Drawing Rune...";
      case GameState.CASTING: return "Casting!";
      default: return "Ready";
    }
  };

  const renderGrimoireItem = (type: SpellType, name: string, desc: string, Icon: any, colorClass: string, bgClass: string) => {
      const progress = cooldownProgress[type] ?? 100;
      const onCooldown = progress < 100;
      
      return (
        <div className="flex items-center gap-4 relative group">
            <div className={`relative w-10 h-10 rounded-lg border flex items-center justify-center overflow-hidden ${onCooldown ? 'border-gray-600 bg-gray-800' : `${colorClass.replace('text', 'border')}/30 ${bgClass}`}`}>
                <Icon className={onCooldown ? 'text-gray-500' : colorClass} size={20} />
                {onCooldown && (
                    <div 
                        className="absolute bottom-0 left-0 right-0 bg-black/50 transition-all duration-100 ease-linear"
                        style={{ height: `${100 - progress}%` }}
                    />
                )}
            </div>
            <div>
                <p className={`font-bold text-sm ${onCooldown ? 'text-gray-500' : colorClass.replace('text-', 'text-')}`}>{name}</p>
                <p className="text-[10px] text-gray-400">{desc}</p>
            </div>
        </div>
      );
  }

  return (
    <div className={`relative w-screen h-[100dvh] bg-black text-white font-sans overflow-hidden ${isShaking ? 'shake-effect' : ''}`}>
      {/* Main Game Layer */}
      <MagicCanvas 
        onSpellCast={handleSpellCast} 
        gameState={gameState} 
        setGameState={setGameState}
        isMirrored={isMirrored}
        fitMode={fitMode}
      />

      {/* Camera Settings Toggle */}
      <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-2">
         <button 
           onClick={() => setShowSettings(!showSettings)}
           className="p-2 bg-gray-800/80 rounded-full hover:bg-gray-700 text-white backdrop-blur-md border border-white/20"
         >
           <Settings size={24} />
         </button>

         {showSettings && (
           <div className="bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/20 flex flex-col gap-3 shadow-xl">
              <button 
                onClick={() => setIsMirrored(!isMirrored)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-colors ${isMirrored ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                <FlipHorizontal size={16} />
                {isMirrored ? "Mirrored" : "True View"}
              </button>
              
              <button 
                onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-colors ${fitMode === 'cover' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                {fitMode === 'cover' ? <Maximize size={16} /> : <Minimize size={16} />}
                {fitMode === 'cover' ? "Fill Screen" : "Fit Camera"}
              </button>
           </div>
         )}
      </div>

      {/* Duel HUD - Health Bars */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
          {/* Player HP */}
          <div className="w-1/3 max-w-sm">
             <div className="flex items-center gap-2 mb-2">
                 <Heart className="text-red-500 fill-red-500" />
                 <span className="font-bold text-xl text-white">You</span>
                 {isPlayerShielded && <Shield className="text-blue-400 animate-pulse" size={20} />}
             </div>
             <div className="w-full h-4 bg-gray-800 rounded-full border border-gray-600 overflow-hidden relative">
                 <div 
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                    style={{ width: `${playerHp}%` }}
                 />
                 <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold shadow-black drop-shadow-md">
                    {playerHp}/100
                 </span>
             </div>
             {/* Enemy Log (Below Player HP) */}
             <div className="mt-4 pointer-events-auto">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Scroll size={12}/> Enemy Actions</h3>
                 <div className="space-y-1">
                     {enemyLog.map(log => (
                         <div key={log.id} className={`text-xs px-2 py-1 rounded bg-black/50 border-l-2 ${log.type === 'attack' ? 'border-red-500 text-red-200' : 'border-gray-500 text-gray-300'}`}>
                             {log.text}
                         </div>
                     ))}
                 </div>
             </div>
          </div>

          {/* Center Info */}
          <div className="flex flex-col items-center pt-8">
             <h1 className="text-3xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg">
                Arcane Duel
            </h1>
            <div className="mt-2 text-sm font-semibold text-gray-300 bg-black/50 px-4 py-1 rounded-full border border-white/10">
                {enemyStatus}
            </div>
          </div>

          {/* Enemy HP */}
          <div className="w-1/3 max-w-sm flex flex-col items-end">
             <div className="flex items-center gap-2 mb-2">
                 <span className="font-bold text-xl text-purple-300">Shadow Construct</span>
                 <Skull className="text-purple-500" />
             </div>
             <div className="w-full h-4 bg-gray-800 rounded-full border border-gray-600 overflow-hidden relative">
                 <div 
                    className="h-full bg-gradient-to-l from-purple-600 to-purple-400 transition-all duration-500"
                    style={{ width: `${enemyHp}%` }}
                 />
                 <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold shadow-black drop-shadow-md">
                    {enemyHp}/100
                 </span>
             </div>
          </div>
      </div>

      {/* Status Pill */}
      <div className="absolute top-28 left-1/2 transform -translate-x-1/2 pointer-events-none">
        <div className={`text-xl font-semibold tracking-wide px-6 py-2 rounded-full border border-white/20 backdrop-blur-md bg-black/40 transition-colors duration-300 ${gameState === GameState.DRAWING ? 'text-cyan-300 border-cyan-500/50' : 'text-gray-300'}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Grimoire (Bottom Left) */}
      <div className="absolute bottom-6 left-6 w-64 p-4 rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl pointer-events-none">
        <h2 className="text-sm font-bold mb-3 text-purple-300 flex items-center gap-2">
            <Info size={16} /> Grimoire
        </h2>
        
        <div className="space-y-3">
            {renderGrimoireItem(SpellType.FROSTBOLT, "Frostbolt", "Draw Line (8 Dmg)", Snowflake, "text-cyan-400", "bg-cyan-500/10")}
            {renderGrimoireItem(SpellType.FIREBALL, "Fireball", "Draw V or Triangle (15 Dmg)", Flame, "text-orange-500", "bg-orange-500/10")}
            {renderGrimoireItem(SpellType.LIGHTNING, "Lightning", "Draw Zig-Zag (25 Dmg)", Zap, "text-yellow-400", "bg-yellow-500/10")}
            {renderGrimoireItem(SpellType.SHIELD, "Shield", "Draw Circle (Block)", Shield, "text-green-400", "bg-green-500/10")}
            {renderGrimoireItem(SpellType.HEAL, "Restoration", "Draw Square (+20 HP)", PlusSquare, "text-emerald-400", "bg-emerald-500/10")}
        </div>
      </div>

      {/* Spell Log (Right) */}
      <div className="absolute top-1/2 right-8 transform -translate-y-1/2 w-64 pointer-events-none">
         <h2 className="text-right text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Spell Log</h2>
         <div className="space-y-3 flex flex-col items-end">
            {spellLog.map((spell, index) => (
                <div 
                    key={spell.id} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-white/10 bg-black/60 backdrop-blur-md shadow-lg transition-all duration-500 ${index === 0 ? 'scale-110 translate-x-[-10px] border-white/30' : 'opacity-70 scale-95'}`}
                >
                    <div className="text-right">
                        <p className={`font-bold ${spell.color}`}>{spell.name}</p>
                        <p className="text-[10px] text-gray-500">Casted just now</p>
                    </div>
                     <div className={`p-2 rounded-full bg-white/5 ${spell.color}`}>
                        {spell.type === SpellType.FIREBALL && <Flame size={16} />}
                        {spell.type === SpellType.SHIELD && <Shield size={16} />}
                        {spell.type === SpellType.LIGHTNING && <Zap size={16} />}
                        {spell.type === SpellType.HEAL && <PlusSquare size={16} />}
                        {spell.type === SpellType.FROSTBOLT && <Snowflake size={16} />}
                     </div>
                </div>
            ))}
         </div>
      </div>
      
      {/* Game Over Overlay */}
      {gameResult && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto">
              <div className="text-center">
                  <h2 className={`text-6xl font-black mb-4 ${gameResult === 'WIN' ? 'text-green-500' : 'text-red-600'}`}>
                      {gameResult === 'WIN' ? 'VICTORY' : 'DEFEATED'}
                  </h2>
                  <p className="text-gray-300 mb-8 text-xl">
                      {gameResult === 'WIN' ? 'The Shadow Construct crumbles before you.' : 'Your magic fades into darkness...'}
                  </p>
                  <button 
                        onClick={resetGame}
                        className="bg-white text-black font-bold py-3 px-8 rounded-full hover:scale-110 transition-transform shadow-xl text-lg"
                    >
                        Play Again
                    </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;