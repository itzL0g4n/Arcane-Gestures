import React, { useState, useCallback, useEffect, useRef } from 'react';
import MagicCanvas from './components/MagicCanvas';
import { GameState, Spell, GestureType, ElementType } from './types';
import { Flame, Shield, Zap, Info, Skull, Heart, Settings, Maximize, Minimize, FlipHorizontal, Snowflake, PlusSquare, Scroll, Clock, Crosshair, ArrowDown, Wind, Waves, Triangle, Circle, Square, Minus, Check } from 'lucide-react';

// Spell Definitions per Element
interface SpellDef {
    name: string;
    desc: string;
    dmg: number;
    heal: number;
    cooldown: number;
    icon: any;
}

const SPELL_DATA: Record<ElementType, Partial<Record<GestureType, SpellDef>>> = {
    [ElementType.FIRE]: {
        [GestureType.TRIANGLE]: { name: "Fireball", desc: "Draw Triangle", dmg: 15, heal: 0, cooldown: 1000, icon: Flame },
        [GestureType.CHECKMARK]: { name: "Meteor", desc: "Draw Checkmark", dmg: 40, heal: 0, cooldown: 15000, icon: ArrowDown },
        [GestureType.CIRCLE]: { name: "Flame Shield", desc: "Draw Circle", dmg: 0, heal: 0, cooldown: 8000, icon: Shield },
        [GestureType.LINE_V]: { name: "Incinerate", desc: "Draw Vertical Line", dmg: 8, heal: 0, cooldown: 500, icon: Minus },
    },
    [ElementType.WATER]: {
        [GestureType.LINE_V]: { name: "Frostbolt", desc: "Draw Vertical Line", dmg: 10, heal: 0, cooldown: 600, icon: Snowflake },
        [GestureType.LINE_H]: { name: "Tsunami", desc: "Draw Horizontal Line", dmg: 20, heal: 0, cooldown: 5000, icon: Waves },
        [GestureType.CIRCLE]: { name: "Bubble Shield", desc: "Draw Circle", dmg: 0, heal: 0, cooldown: 8000, icon: Shield },
        [GestureType.SQUARE]: { name: "Restoration", desc: "Draw Square", dmg: 0, heal: 25, cooldown: 12000, icon: PlusSquare },
    },
    [ElementType.LIGHTNING]: {
        [GestureType.LINE_V]: { name: "Zap", desc: "Draw Vertical Line", dmg: 5, heal: 0, cooldown: 200, icon: Zap },
        [GestureType.ZIGZAG]: { name: "Chain Lightning", desc: "Draw ZigZag", dmg: 30, heal: 0, cooldown: 6000, icon: Zap },
        [GestureType.CIRCLE]: { name: "Static Field", desc: "Draw Circle", dmg: 0, heal: 0, cooldown: 8000, icon: Shield },
        [GestureType.TRIANGLE]: { name: "Thunderclap", desc: "Draw Triangle", dmg: 20, heal: 0, cooldown: 3000, icon: Triangle },
    },
    [ElementType.AIR]: {
        [GestureType.LINE_H]: { name: "Wind Slash", desc: "Draw Horizontal Line", dmg: 8, heal: 0, cooldown: 300, icon: Wind },
        [GestureType.S_SHAPE]: { name: "Tornado", desc: "Draw S Shape", dmg: 15, heal: 0, cooldown: 10000, icon: Clock }, // Time warp effect logically
        [GestureType.CIRCLE]: { name: "Air Barrier", desc: "Draw Circle", dmg: 0, heal: 0, cooldown: 8000, icon: Shield },
        [GestureType.TRIANGLE]: { name: "Vacuum", desc: "Draw Triangle", dmg: 25, heal: 0, cooldown: 5000, icon: Crosshair },
    }
};

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementType | null>(null);
  
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [spellLog, setSpellLog] = useState<Spell[]>([]);
  const [enemyLog, setEnemyLog] = useState<{id:string, text:string, type:'attack'|'info'}[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  
  const [isMirrored, setIsMirrored] = useState(true); 
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('contain'); 
  const [showSettings, setShowSettings] = useState(false);

  // Stats
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [isPlayerShielded, setIsPlayerShielded] = useState(false);
  const [enemyStatus, setEnemyStatus] = useState("Waiting...");
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSS' | null>(null);
  
  const [lastCastTimes, setLastCastTimes] = useState<Record<string, number>>({});
  const [cooldownProgress, setCooldownProgress] = useState<Record<string, number>>({}); 

  const isPlayerShieldedRef = useRef(false);
  const gameOverRef = useRef(false);

  useEffect(() => { isPlayerShieldedRef.current = isPlayerShielded; }, [isPlayerShielded]);

  useEffect(() => {
    if (playerHp <= 0) { setGameResult('LOSS'); gameOverRef.current = true; }
    else if (enemyHp <= 0) { setGameResult('WIN'); gameOverRef.current = true; }
  }, [playerHp, enemyHp]);

  const triggerShake = () => { setIsShaking(true); setTimeout(() => setIsShaking(false), 500); };
  const addEnemyLog = (text: string, type: 'attack' | 'info' = 'info') => {
      setEnemyLog(prev => [{id: Date.now().toString() + Math.random(), text, type}, ...prev].slice(0, 4));
  };

  useEffect(() => {
      if (!selectedElement) return;
      const interval = setInterval(() => {
          const now = Date.now();
          const newProgress: Record<string, number> = {};
          const spells = SPELL_DATA[selectedElement];
          
          Object.entries(spells).forEach(([gesture, def]) => {
              const spell = def as SpellDef;
              if (!spell) return;
              const lastCast = lastCastTimes[gesture] || 0;
              const elapsed = now - lastCast;
              if (elapsed < spell.cooldown) newProgress[gesture] = (elapsed / spell.cooldown) * 100;
              else newProgress[gesture] = 100;
          });
          setCooldownProgress(newProgress);
      }, 100);
      return () => clearInterval(interval);
  }, [lastCastTimes, selectedElement]);

  const handleSpellCast = useCallback((gesture: GestureType) => {
    if (gameOverRef.current || !hasStarted || !selectedElement) return;
    
    const spellDef = SPELL_DATA[selectedElement][gesture];
    if (!spellDef) return; // Not a valid spell for this element

    const now = Date.now();
    const lastCast = lastCastTimes[gesture] || 0;
    if (now - lastCast < spellDef.cooldown) {
        setEnemyStatus(`${spellDef.name} on Cooldown!`);
        return; 
    }

    setLastCastTimes(prev => ({...prev, [gesture]: now}));

    // Apply Effects
    let status = `${spellDef.name}!`;
    if (spellDef.dmg > 0) {
        setEnemyHp(prev => Math.max(0, prev - spellDef.dmg));
        status += ` (${spellDef.dmg} Dmg)`;
        triggerShake();
    }
    if (spellDef.heal > 0) {
        setPlayerHp(prev => Math.min(100, prev + spellDef.heal));
        status += ` (+${spellDef.heal} HP)`;
    }
    if (gesture === GestureType.CIRCLE) {
        setIsPlayerShielded(true);
        setTimeout(() => setIsPlayerShielded(false), 4000);
        status = "Shield Up!";
    }
    if (gesture === GestureType.S_SHAPE) {
        status += " (Slowed)";
        // Logic for slow handled in enemy AI
    }

    setEnemyStatus(status);

    const spellData: Spell = {
      id: Date.now().toString(),
      name: spellDef.name,
      element: selectedElement,
      gesture: gesture,
      color: "text-white", // Handled by UI
      timestamp: Date.now(),
    };
    setSpellLog((prev) => [spellData, ...prev].slice(0, 5));
  }, [lastCastTimes, hasStarted, selectedElement]);

  useEffect(() => {
    if (gameOverRef.current || !hasStarted) return;
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
             addEnemyLog("Attack Blocked!", 'info');
          } else {
             setPlayerHp(prev => Math.max(0, prev - 10));
             setEnemyStatus("Shadow Bolt Hit You!");
             addEnemyLog("Shadow Bolt: -10 HP", 'attack');
             triggerShake();
          }
        }, 1500);
      } else if (actionRoll < 0.7) {
        setEnemyStatus("Gathering Dark Energy...");
      } else {
        setEnemyStatus("Fast Strike!");
        setTimeout(() => {
             if (gameOverRef.current) return;
             if (isPlayerShieldedRef.current) setEnemyStatus("Strike Deflected!");
             else {
                setPlayerHp(prev => Math.max(0, prev - 5));
                addEnemyLog("Strike: -5 HP", 'attack');
             }
        }, 800);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [hasStarted]);

  const startGame = (element: ElementType) => {
      setSelectedElement(element);
      setHasStarted(true);
  };

  const resetGame = () => {
    setPlayerHp(100); setEnemyHp(100); setGameResult(null); setSpellLog([]); setEnemyLog([]);
    gameOverRef.current = false; setEnemyStatus("Waiting..."); setLastCastTimes({});
    setHasStarted(false); setSelectedElement(null);
  };

  if (!hasStarted) {
      return (
          <div className="w-screen h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-black to-black"></div>
               <div className="z-10 text-center w-full max-w-4xl px-4">
                   <h1 className="text-6xl font-black mb-12 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">CHOOSE YOUR ELEMENT</h1>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       {/* Fire */}
                       <button onClick={() => startGame(ElementType.FIRE)} className="group relative h-80 rounded-2xl border border-orange-900/50 bg-orange-950/20 hover:bg-orange-900/40 transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]">
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <Flame size={64} className="text-orange-500 mb-4 group-hover:animate-bounce" />
                               <h2 className="text-2xl font-bold text-orange-400">PYROMANCER</h2>
                               <p className="text-xs text-orange-300 mt-2 px-6">High Damage & Burst</p>
                           </div>
                       </button>

                       {/* Water */}
                       <button onClick={() => startGame(ElementType.WATER)} className="group relative h-80 rounded-2xl border border-cyan-900/50 bg-cyan-950/20 hover:bg-cyan-900/40 transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <Waves size={64} className="text-cyan-400 mb-4" />
                               <h2 className="text-2xl font-bold text-cyan-300">HYDROMANCER</h2>
                               <p className="text-xs text-cyan-200 mt-2 px-6">Healing & Defense</p>
                           </div>
                       </button>

                       {/* Lightning */}
                       <button onClick={() => startGame(ElementType.LIGHTNING)} className="group relative h-80 rounded-2xl border border-yellow-900/50 bg-yellow-950/20 hover:bg-yellow-900/40 transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <Zap size={64} className="text-yellow-400 mb-4" />
                               <h2 className="text-2xl font-bold text-yellow-300">STORMCALLER</h2>
                               <p className="text-xs text-yellow-200 mt-2 px-6">Fast & Critical Hits</p>
                           </div>
                       </button>

                       {/* Air */}
                       <button onClick={() => startGame(ElementType.AIR)} className="group relative h-80 rounded-2xl border border-slate-700/50 bg-slate-800/20 hover:bg-slate-700/40 transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(148,163,184,0.4)]">
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <Wind size={64} className="text-slate-300 mb-4" />
                               <h2 className="text-2xl font-bold text-slate-200">AEROMANCER</h2>
                               <p className="text-xs text-slate-400 mt-2 px-6">Control & Speed</p>
                           </div>
                       </button>
                   </div>
               </div>
          </div>
      )
  }

  const spells = selectedElement ? SPELL_DATA[selectedElement] : {};

  return (
    <div className={`relative w-screen h-[100dvh] bg-black text-white font-sans overflow-hidden ${isShaking ? 'shake-effect' : ''}`}>
      <MagicCanvas 
        onSpellCast={handleSpellCast} 
        gameState={gameState} 
        setGameState={setGameState}
        isMirrored={isMirrored}
        fitMode={fitMode}
        selectedElement={selectedElement!}
      />

      {/* Settings & HUD */}
      <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-2">
         <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-gray-800/80 rounded-full hover:bg-gray-700 text-white backdrop-blur-md border border-white/20"><Settings size={24} /></button>
         {showSettings && (
           <div className="bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/20 flex flex-col gap-3 shadow-xl">
              <button onClick={() => setIsMirrored(!isMirrored)} className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold ${isMirrored ? 'bg-purple-600' : 'bg-gray-700'}`}><FlipHorizontal size={16} /> {isMirrored ? "Mirrored" : "True View"}</button>
              <button onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')} className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold ${fitMode === 'cover' ? 'bg-blue-600' : 'bg-gray-700'}`}>{fitMode === 'cover' ? <Maximize size={16} /> : <Minimize size={16} />} {fitMode === 'cover' ? "Fill" : "Fit"}</button>
           </div>
         )}
      </div>

      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
          <div className="w-1/3 max-w-sm">
             <div className="flex items-center gap-2 mb-2"><Heart className="text-red-500 fill-red-500" /><span className="font-bold text-xl text-white">You</span>{isPlayerShielded && <Shield className="text-blue-400 animate-pulse" size={20} />}</div>
             <div className="w-full h-4 bg-gray-800 rounded-full border border-gray-600 overflow-hidden relative"><div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500" style={{ width: `${playerHp}%` }} /><span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold shadow-black drop-shadow-md">{playerHp}/100</span></div>
             <div className="mt-4 pointer-events-auto"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Scroll size={12}/> Enemy Actions</h3><div className="space-y-1">{enemyLog.map(log => (<div key={log.id} className={`text-xs px-2 py-1 rounded bg-black/50 border-l-2 ${log.type === 'attack' ? 'border-red-500 text-red-200' : 'border-gray-500 text-gray-300'}`}>{log.text}</div>))}</div></div>
          </div>

          <div className="flex flex-col items-center pt-8">
             <h1 className="text-3xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg">Arcane Duel</h1>
             <div className="mt-2 text-sm font-semibold text-gray-300 bg-black/50 px-4 py-1 rounded-full border border-white/10">{enemyStatus}</div>
          </div>

          <div className="w-1/3 max-w-sm flex flex-col items-end">
             <div className="flex items-center gap-2 mb-2"><span className="font-bold text-xl text-purple-300">Shadow Construct</span><Skull className="text-purple-500" /></div>
             <div className="w-full h-4 bg-gray-800 rounded-full border border-gray-600 overflow-hidden relative"><div className="h-full bg-gradient-to-l from-purple-600 to-purple-400 transition-all duration-500" style={{ width: `${enemyHp}%` }} /><span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold shadow-black drop-shadow-md">{enemyHp}/100</span></div>
          </div>
      </div>

      <div className="absolute top-28 left-1/2 transform -translate-x-1/2 pointer-events-none">
        <div className={`text-xl font-semibold tracking-wide px-6 py-2 rounded-full border border-white/20 backdrop-blur-md bg-black/40 transition-colors duration-300 ${gameState === GameState.DRAWING ? 'text-cyan-300 border-cyan-500/50' : 'text-gray-300'}`}>
          {gameState === GameState.DRAWING ? "Drawing..." : "Ready"}
        </div>
      </div>

      {/* Grimoire - No Scrollbar */}
      <div className="absolute bottom-6 left-6 pointer-events-none">
        <div className="flex flex-col gap-2">
            {Object.entries(spells).map(([gesture, def]) => {
                const spell = def as SpellDef;
                if(!spell) return null;
                const progress = cooldownProgress[gesture] ?? 100;
                const onCooldown = progress < 100;
                return (
                    <div key={gesture} className="flex items-center gap-3 bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10 w-64">
                         <div className="relative w-8 h-8 flex-shrink-0 flex items-center justify-center bg-gray-800 rounded overflow-hidden">
                             <spell.icon size={18} className={onCooldown ? 'text-gray-500' : 'text-white'} />
                             {onCooldown && <div className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: `${100-progress}%`}} />}
                         </div>
                         <div>
                             <div className="font-bold text-xs text-gray-200">{spell.name}</div>
                             <div className="text-[10px] text-gray-400">{spell.desc}</div>
                         </div>
                    </div>
                );
            })}
        </div>
      </div>
      
      {/* Game Over */}
      {gameResult && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto">
              <div className="text-center">
                  <h2 className={`text-6xl font-black mb-4 ${gameResult === 'WIN' ? 'text-green-500' : 'text-red-600'}`}>{gameResult === 'WIN' ? 'VICTORY' : 'DEFEATED'}</h2>
                  <button onClick={resetGame} className="bg-white text-black font-bold py-3 px-8 rounded-full hover:scale-110 transition-transform shadow-xl text-lg">Main Menu</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;