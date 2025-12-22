import React, { useState, useCallback, useEffect, useRef } from 'react';
import MagicCanvas from './components/MagicCanvas';
import { GameState, Spell, GestureType, ElementType } from './types';
import { Flame, Shield, Zap, Skull, Heart, Settings, Maximize, Minimize, FlipHorizontal, Snowflake, PlusSquare, Scroll, Clock, Crosshair, ArrowDown, Wind, Waves, Triangle, Minus, Languages } from 'lucide-react';

// --- LOCALIZATION SYSTEM ---
type Language = 'en' | 'vi';

const TRANSLATIONS = {
  en: {
    title: "Arcane Duel",
    choose_title: "CHOOSE YOUR ELEMENT",
    ready: "Ready",
    drawing: "Drawing...",
    waiting: "Waiting...",
    victory: "VICTORY",
    defeated: "DEFEATED",
    main_menu: "Main Menu",
    settings: {
      mirrored: "Mirrored",
      true_view: "True View",
      fill: "Fill",
      fit: "Fit",
      language: "Tiếng Việt" 
    },
    hud: {
      you: "You",
      enemy_actions: "Enemy Actions",
      shadow_construct: "Shadow Construct",
      dmg: "Dmg",
      hp: "HP",
      slowed: "Slowed",
      cooldown: "Cooldown"
    },
    actions: {
      shield_up: "Shield Up!",
      shadow_bolt_cast: "Casting Shadow Bolt!",
      shadow_bolt_hit: "Shadow Bolt Hit You!",
      attack_blocked: "Attack Blocked!",
      dark_energy: "Gathering Dark Energy...",
      fast_strike: "Fast Strike!",
      strike_deflected: "Strike Deflected!",
      strike_hit: "Strike: -5 HP",
      shadow_bolt_log: "Shadow Bolt: -10 HP"
    },
    elements: {
      [ElementType.FIRE]: { name: "PYROMANCER", desc: "High Damage & Burst" },
      [ElementType.WATER]: { name: "HYDROMANCER", desc: "Healing & Defense" },
      [ElementType.LIGHTNING]: { name: "STORMCALLER", desc: "Fast & Critical Hits" },
      [ElementType.AIR]: { name: "AEROMANCER", desc: "Control & Speed" },
    },
    spells: {
      [ElementType.FIRE]: {
        [GestureType.TRIANGLE]: { name: "Fireball", desc: "Draw Triangle" },
        [GestureType.CHECKMARK]: { name: "Meteor", desc: "Draw Checkmark" },
        [GestureType.CIRCLE]: { name: "Flame Shield", desc: "Draw Circle" },
        [GestureType.V_SHAPE]: { name: "Incinerate", desc: "Draw 'V'" },
      },
      [ElementType.WATER]: {
        [GestureType.V_SHAPE]: { name: "Frostbolt", desc: "Draw 'V'" },
        [GestureType.TRIANGLE]: { name: "Tsunami", desc: "Draw Triangle" },
        [GestureType.CIRCLE]: { name: "Bubble Shield", desc: "Draw Circle" },
        [GestureType.SQUARE]: { name: "Restoration", desc: "Draw Square" },
      },
      [ElementType.LIGHTNING]: {
        [GestureType.V_SHAPE]: { name: "Zap", desc: "Draw 'V'" },
        [GestureType.ZIGZAG]: { name: "Chain Lightning", desc: "Draw ZigZag" },
        [GestureType.CIRCLE]: { name: "Static Field", desc: "Draw Circle" },
        [GestureType.TRIANGLE]: { name: "Thunderclap", desc: "Draw Triangle" },
      },
      [ElementType.AIR]: {
        [GestureType.CHECKMARK]: { name: "Wind Slash", desc: "Draw Checkmark" },
        [GestureType.S_SHAPE]: { name: "Tornado", desc: "Draw 'S'" },
        [GestureType.CIRCLE]: { name: "Air Barrier", desc: "Draw Circle" },
        [GestureType.TRIANGLE]: { name: "Vacuum", desc: "Draw Triangle" },
      }
    }
  },
  vi: {
    title: "Đại Chiến Pháp Thuật",
    choose_title: "CHỌN NGUYÊN TỐ",
    ready: "Sẵn sàng",
    drawing: "Đang vẽ...",
    waiting: "Đang chờ...",
    victory: "CHIẾN THẮNG",
    defeated: "THẤT BẠI",
    main_menu: "Màn hình chính",
    settings: {
      mirrored: "Gương",
      true_view: "Thực tế",
      fill: "Lấp đầy",
      fit: "Vừa vặn",
      language: "English"
    },
    hud: {
      you: "Bạn",
      enemy_actions: "Hành động địch",
      shadow_construct: "Bóng Tối",
      dmg: "Sát thương",
      hp: "Máu",
      slowed: "Làm chậm",
      cooldown: "Hồi chiêu"
    },
    actions: {
      shield_up: "Bật Khiên!",
      shadow_bolt_cast: "Đang niệm Bóng Tối!",
      shadow_bolt_hit: "Trúng đạn bóng tối!",
      attack_blocked: "Đã chặn đòn!",
      dark_energy: "Đang tụ năng lượng...",
      fast_strike: "Đánh nhanh!",
      strike_deflected: "Đã phản đòn!",
      strike_hit: "Bị đánh: -5 Máu",
      shadow_bolt_log: "Bóng tối: -10 Máu"
    },
    elements: {
      [ElementType.FIRE]: { name: "HỎA SƯ", desc: "Sát thương lớn & Dồn dam" },
      [ElementType.WATER]: { name: "THỦY SƯ", desc: "Hồi phục & Phòng thủ" },
      [ElementType.LIGHTNING]: { name: "LÔI SƯ", desc: "Tốc độ & Chí mạng" },
      [ElementType.AIR]: { name: "PHONG SƯ", desc: "Kiểm soát & Tốc độ" },
    },
    spells: {
      [ElementType.FIRE]: {
        [GestureType.TRIANGLE]: { name: "Cầu Lửa", desc: "Vẽ Tam Giác" },
        [GestureType.CHECKMARK]: { name: "Thiên Thạch", desc: "Vẽ Dấu Tích" },
        [GestureType.CIRCLE]: { name: "Khiên Lửa", desc: "Vẽ Hình Tròn" },
        [GestureType.V_SHAPE]: { name: "Thiêu Đốt", desc: "Vẽ chữ V" },
      },
      [ElementType.WATER]: {
        [GestureType.V_SHAPE]: { name: "Mũi Tên Băng", desc: "Vẽ chữ V" },
        [GestureType.TRIANGLE]: { name: "Sóng Thần", desc: "Vẽ Tam Giác" },
        [GestureType.CIRCLE]: { name: "Khiên Bong Bóng", desc: "Vẽ Hình Tròn" },
        [GestureType.SQUARE]: { name: "Hồi Phục", desc: "Vẽ Hình Vuông" },
      },
      [ElementType.LIGHTNING]: {
        [GestureType.V_SHAPE]: { name: "Giật Điện", desc: "Vẽ chữ V" },
        [GestureType.ZIGZAG]: { name: "Chuỗi Sét", desc: "Vẽ Zíc Zắc" },
        [GestureType.CIRCLE]: { name: "Trường Tĩnh Điện", desc: "Vẽ Hình Tròn" },
        [GestureType.TRIANGLE]: { name: "Tiếng Sấm", desc: "Vẽ Tam Giác" },
      },
      [ElementType.AIR]: {
        [GestureType.CHECKMARK]: { name: "Phong Đao", desc: "Vẽ Dấu Tích" },
        [GestureType.S_SHAPE]: { name: "Lốc Xoáy", desc: "Vẽ Chữ S" },
        [GestureType.CIRCLE]: { name: "Lá Chắn Gió", desc: "Vẽ Hình Tròn" },
        [GestureType.TRIANGLE]: { name: "Chân Không", desc: "Vẽ Tam Giác" },
      }
    }
  }
};

// Spell Stats Definition (Independent of Language)
interface SpellStats {
    dmg: number;
    heal: number;
    cooldown: number;
    icon: any;
}

const SPELL_STATS: Record<ElementType, Partial<Record<GestureType, SpellStats>>> = {
    [ElementType.FIRE]: {
        [GestureType.TRIANGLE]: { dmg: 15, heal: 0, cooldown: 1000, icon: Flame },
        [GestureType.CHECKMARK]: { dmg: 40, heal: 0, cooldown: 15000, icon: ArrowDown },
        [GestureType.CIRCLE]: { dmg: 0, heal: 0, cooldown: 8000, icon: Shield },
        [GestureType.V_SHAPE]: { dmg: 8, heal: 0, cooldown: 500, icon: Minus },
    },
    [ElementType.WATER]: {
        [GestureType.V_SHAPE]: { dmg: 10, heal: 0, cooldown: 600, icon: Snowflake },
        [GestureType.TRIANGLE]: { dmg: 20, heal: 0, cooldown: 5000, icon: Waves }, 
        [GestureType.CIRCLE]: { dmg: 0, heal: 0, cooldown: 8000, icon: Shield },
        [GestureType.SQUARE]: { dmg: 0, heal: 25, cooldown: 12000, icon: PlusSquare },
    },
    [ElementType.LIGHTNING]: {
        [GestureType.V_SHAPE]: { dmg: 5, heal: 0, cooldown: 200, icon: Zap },
        [GestureType.ZIGZAG]: { dmg: 30, heal: 0, cooldown: 6000, icon: Zap },
        [GestureType.CIRCLE]: { dmg: 0, heal: 0, cooldown: 8000, icon: Shield },
        [GestureType.TRIANGLE]: { dmg: 20, heal: 0, cooldown: 3000, icon: Triangle },
    },
    [ElementType.AIR]: {
        [GestureType.CHECKMARK]: { dmg: 8, heal: 0, cooldown: 300, icon: Wind }, 
        [GestureType.S_SHAPE]: { dmg: 15, heal: 0, cooldown: 10000, icon: Clock }, 
        [GestureType.CIRCLE]: { dmg: 0, heal: 0, cooldown: 8000, icon: Shield },
        [GestureType.TRIANGLE]: { dmg: 25, heal: 0, cooldown: 5000, icon: Crosshair },
    }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

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
  const [enemyStatus, setEnemyStatus] = useState("");
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSS' | null>(null);
  
  const [lastCastTimes, setLastCastTimes] = useState<Record<string, number>>({});
  const [cooldownProgress, setCooldownProgress] = useState<Record<string, number>>({}); 

  const isPlayerShieldedRef = useRef(false);
  const gameOverRef = useRef(false);

  // Set initial status when language changes or game starts
  useEffect(() => {
     if (hasStarted && !gameResult) {
        setEnemyStatus(t.waiting);
     }
  }, [lang, hasStarted, gameResult]);

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
          const stats = SPELL_STATS[selectedElement];
          
          Object.entries(stats).forEach(([gesture, def]) => {
              const spellStats = def as SpellStats;
              if (!spellStats) return;
              const lastCast = lastCastTimes[gesture] || 0;
              const elapsed = now - lastCast;
              if (elapsed < spellStats.cooldown) newProgress[gesture] = (elapsed / spellStats.cooldown) * 100;
              else newProgress[gesture] = 100;
          });
          setCooldownProgress(newProgress);
      }, 100);
      return () => clearInterval(interval);
  }, [lastCastTimes, selectedElement]);

  const handleSpellCast = useCallback((gesture: GestureType) => {
    if (gameOverRef.current || !hasStarted || !selectedElement) return;
    
    const spellStats = SPELL_STATS[selectedElement][gesture];
    if (!spellStats) return; // Not a valid spell for this element

    const now = Date.now();
    const lastCast = lastCastTimes[gesture] || 0;
    if (now - lastCast < spellStats.cooldown) {
        const spellName = TRANSLATIONS[lang].spells[selectedElement][gesture]?.name || "Spell";
        setEnemyStatus(`${spellName} ${TRANSLATIONS[lang].hud.cooldown}!`);
        return; 
    }

    setLastCastTimes(prev => ({...prev, [gesture]: now}));

    // Get localized name
    const spellText = TRANSLATIONS[lang].spells[selectedElement][gesture];
    const spellName = spellText?.name || "Unknown";

    // Apply Effects
    let status = `${spellName}!`;
    if (spellStats.dmg > 0) {
        setEnemyHp(prev => Math.max(0, prev - spellStats.dmg));
        status += ` (${spellStats.dmg} ${TRANSLATIONS[lang].hud.dmg})`;
        triggerShake();
    }
    if (spellStats.heal > 0) {
        setPlayerHp(prev => Math.min(100, prev + spellStats.heal));
        status += ` (+${spellStats.heal} ${TRANSLATIONS[lang].hud.hp})`;
    }
    if (gesture === GestureType.CIRCLE) {
        setIsPlayerShielded(true);
        setTimeout(() => setIsPlayerShielded(false), 4000);
        status = TRANSLATIONS[lang].actions.shield_up;
    }
    if (gesture === GestureType.S_SHAPE) {
        status += ` (${TRANSLATIONS[lang].hud.slowed})`;
    }

    setEnemyStatus(status);

    const spellData: Spell = {
      id: Date.now().toString(),
      name: spellName,
      element: selectedElement,
      gesture: gesture,
      color: "text-white", 
      timestamp: Date.now(),
    };
    setSpellLog((prev) => [spellData, ...prev].slice(0, 5));
  }, [lastCastTimes, hasStarted, selectedElement, lang]);

  useEffect(() => {
    if (gameOverRef.current || !hasStarted) return;
    const interval = setInterval(() => {
      if (gameOverRef.current) return;
      
      const currentLang = lang; // Capture current language for async callbacks
      const currentT = TRANSLATIONS[currentLang];

      const actionRoll = Math.random();
      if (actionRoll < 0.4) {
        setEnemyStatus(currentT.actions.shadow_bolt_cast);
        addEnemyLog(currentT.actions.shadow_bolt_cast, 'info');
        setTimeout(() => {
          if (gameOverRef.current) return;
          if (isPlayerShieldedRef.current) {
             setEnemyStatus(currentT.actions.attack_blocked);
             addEnemyLog(currentT.actions.attack_blocked, 'info');
          } else {
             setPlayerHp(prev => Math.max(0, prev - 10));
             setEnemyStatus(currentT.actions.shadow_bolt_hit);
             addEnemyLog(currentT.actions.shadow_bolt_log, 'attack');
             triggerShake();
          }
        }, 1500);
      } else if (actionRoll < 0.7) {
        setEnemyStatus(currentT.actions.dark_energy);
      } else {
        setEnemyStatus(currentT.actions.fast_strike);
        setTimeout(() => {
             if (gameOverRef.current) return;
             if (isPlayerShieldedRef.current) setEnemyStatus(currentT.actions.strike_deflected);
             else {
                setPlayerHp(prev => Math.max(0, prev - 5));
                addEnemyLog(currentT.actions.strike_hit, 'attack');
             }
        }, 800);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [hasStarted, lang]);

  const startGame = (element: ElementType) => {
      setSelectedElement(element);
      setHasStarted(true);
      setEnemyStatus(t.waiting);
  };

  const resetGame = () => {
    setPlayerHp(100); setEnemyHp(100); setGameResult(null); setSpellLog([]); setEnemyLog([]);
    gameOverRef.current = false; setEnemyStatus(t.waiting); setLastCastTimes({});
    setHasStarted(false); setSelectedElement(null);
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'vi' : 'en');
  };

  if (!hasStarted) {
      return (
          <div className="w-screen h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-black to-black"></div>
               
               {/* Language Toggle Main Menu */}
               <div className="absolute top-6 right-6 z-50">
                    <button onClick={toggleLanguage} className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 rounded-full hover:bg-purple-700 transition-colors border border-white/20 font-bold">
                        <Languages size={18} />
                        {t.settings.language}
                    </button>
               </div>

               <div className="z-10 text-center w-full max-w-6xl px-4">
                   <h1 className="text-6xl font-black mb-12 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                        {t.choose_title}
                   </h1>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       {/* Fire */}
                       <button onClick={() => startGame(ElementType.FIRE)} className="group relative h-80 rounded-2xl border border-orange-900/50 bg-orange-950/20 hover:bg-orange-900/40 transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]">
                           <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                               <Flame size={64} className="text-orange-500 mb-4 group-hover:animate-bounce" />
                               <h2 className="text-2xl font-bold text-orange-400">{t.elements[ElementType.FIRE].name}</h2>
                               <p className="text-xs text-orange-300 mt-2">{t.elements[ElementType.FIRE].desc}</p>
                           </div>
                       </button>

                       {/* Water */}
                       <button onClick={() => startGame(ElementType.WATER)} className="group relative h-80 rounded-2xl border border-cyan-900/50 bg-cyan-950/20 hover:bg-cyan-900/40 transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                           <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                               <Waves size={64} className="text-cyan-400 mb-4" />
                               <h2 className="text-2xl font-bold text-cyan-300">{t.elements[ElementType.WATER].name}</h2>
                               <p className="text-xs text-cyan-200 mt-2">{t.elements[ElementType.WATER].desc}</p>
                           </div>
                       </button>

                       {/* Lightning */}
                       <button onClick={() => startGame(ElementType.LIGHTNING)} className="group relative h-80 rounded-2xl border border-yellow-900/50 bg-yellow-950/20 hover:bg-yellow-900/40 transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                           <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                               <Zap size={64} className="text-yellow-400 mb-4" />
                               <h2 className="text-2xl font-bold text-yellow-300">{t.elements[ElementType.LIGHTNING].name}</h2>
                               <p className="text-xs text-yellow-200 mt-2">{t.elements[ElementType.LIGHTNING].desc}</p>
                           </div>
                       </button>

                       {/* Air */}
                       <button onClick={() => startGame(ElementType.AIR)} className="group relative h-80 rounded-2xl border border-slate-700/50 bg-slate-800/20 hover:bg-slate-700/40 transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(148,163,184,0.4)]">
                           <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                               <Wind size={64} className="text-slate-300 mb-4" />
                               <h2 className="text-2xl font-bold text-slate-200">{t.elements[ElementType.AIR].name}</h2>
                               <p className="text-xs text-slate-400 mt-2">{t.elements[ElementType.AIR].desc}</p>
                           </div>
                       </button>
                   </div>
               </div>
          </div>
      )
  }

  const currentStats = selectedElement ? SPELL_STATS[selectedElement] : {};
  const currentSpellTexts = selectedElement ? t.spells[selectedElement] : {};

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
           <div className="bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/20 flex flex-col gap-3 shadow-xl w-48">
              <button onClick={() => setIsMirrored(!isMirrored)} className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold w-full ${isMirrored ? 'bg-purple-600' : 'bg-gray-700'}`}><FlipHorizontal size={16} /> {isMirrored ? t.settings.mirrored : t.settings.true_view}</button>
              <button onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')} className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold w-full ${fitMode === 'cover' ? 'bg-blue-600' : 'bg-gray-700'}`}>{fitMode === 'cover' ? <Maximize size={16} /> : <Minimize size={16} />} {fitMode === 'cover' ? t.settings.fill : t.settings.fit}</button>
              <button onClick={toggleLanguage} className="flex items-center gap-2 px-3 py-2 rounded text-sm font-bold w-full bg-gray-700 hover:bg-gray-600"><Languages size={16} /> {t.settings.language}</button>
           </div>
         )}
      </div>

      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
          <div className="w-1/3 max-w-sm">
             <div className="flex items-center gap-2 mb-2"><Heart className="text-red-500 fill-red-500" /><span className="font-bold text-xl text-white">{t.hud.you}</span>{isPlayerShielded && <Shield className="text-blue-400 animate-pulse" size={20} />}</div>
             <div className="w-full h-4 bg-gray-800 rounded-full border border-gray-600 overflow-hidden relative"><div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500" style={{ width: `${playerHp}%` }} /><span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold shadow-black drop-shadow-md">{playerHp}/100</span></div>
             <div className="mt-4 pointer-events-auto"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Scroll size={12}/> {t.hud.enemy_actions}</h3><div className="space-y-1">{enemyLog.map(log => (<div key={log.id} className={`text-xs px-2 py-1 rounded bg-black/50 border-l-2 ${log.type === 'attack' ? 'border-red-500 text-red-200' : 'border-gray-500 text-gray-300'}`}>{log.text}</div>))}</div></div>
          </div>

          <div className="flex flex-col items-center pt-8">
             <h1 className="text-3xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg">{t.title}</h1>
             <div className="mt-2 text-sm font-semibold text-gray-300 bg-black/50 px-4 py-1 rounded-full border border-white/10 min-w-[200px] text-center min-h-[30px] flex items-center justify-center">{enemyStatus}</div>
          </div>

          <div className="w-1/3 max-w-sm flex flex-col items-end">
             <div className="flex items-center gap-2 mb-2"><span className="font-bold text-xl text-purple-300">{t.hud.shadow_construct}</span><Skull className="text-purple-500" /></div>
             <div className="w-full h-4 bg-gray-800 rounded-full border border-gray-600 overflow-hidden relative"><div className="h-full bg-gradient-to-l from-purple-600 to-purple-400 transition-all duration-500" style={{ width: `${enemyHp}%` }} /><span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold shadow-black drop-shadow-md">{enemyHp}/100</span></div>
          </div>
      </div>

      <div className="absolute top-28 left-1/2 transform -translate-x-1/2 pointer-events-none">
        <div className={`text-xl font-semibold tracking-wide px-6 py-2 rounded-full border border-white/20 backdrop-blur-md bg-black/40 transition-colors duration-300 ${gameState === GameState.DRAWING ? 'text-cyan-300 border-cyan-500/50' : 'text-gray-300'}`}>
          {gameState === GameState.DRAWING ? t.drawing : t.ready}
        </div>
      </div>

      {/* Grimoire - No Scrollbar */}
      <div className="absolute bottom-6 left-6 pointer-events-none">
        <div className="flex flex-col gap-2">
            {Object.entries(currentStats).map(([gesture, stats]) => {
                const spellStats = stats as SpellStats;
                const spellText = currentSpellTexts[gesture as GestureType];
                if(!spellStats || !spellText) return null;
                
                const progress = cooldownProgress[gesture] ?? 100;
                const onCooldown = progress < 100;
                return (
                    <div key={gesture} className="flex items-center gap-3 bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10 w-64">
                         <div className="relative w-8 h-8 flex-shrink-0 flex items-center justify-center bg-gray-800 rounded overflow-hidden">
                             <spellStats.icon size={18} className={onCooldown ? 'text-gray-500' : 'text-white'} />
                             {onCooldown && <div className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: `${100-progress}%`}} />}
                         </div>
                         <div>
                             <div className="font-bold text-xs text-gray-200">{spellText.name}</div>
                             <div className="text-[10px] text-gray-400">{spellText.desc}</div>
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
                  <h2 className={`text-6xl font-black mb-4 ${gameResult === 'WIN' ? 'text-green-500' : 'text-red-600'}`}>{gameResult === 'WIN' ? t.victory : t.defeated}</h2>
                  <button onClick={resetGame} className="bg-white text-black font-bold py-3 px-8 rounded-full hover:scale-110 transition-transform shadow-xl text-lg">{t.main_menu}</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;