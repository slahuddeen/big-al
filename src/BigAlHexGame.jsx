// ==================== BIG AL: ISOMETRIC 3D WORLD ====================
import React, { useReducer, useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { areNeighbors } from './world/cellGraph.js';
import { TERRAIN_TYPES } from './data/terrain.js';
import { SPECIES_DATA } from './data/species.js';
import { initialGameState, gameReducer } from './game/gameState.js';
import { calculateFiercenessRatio } from './utils/combatUtils.js';
// Component imports
import WorldView from './components/WorldView.jsx';
import StatusPanel from './components/StatusPanel.jsx';
import TimeWidget from './components/TimeWidget.jsx';
import CreaturesPanel from './components/CreaturesPanel.jsx';
import ActionBar, { actionHotkeys } from './components/ActionBar.jsx';
import Minimap from './components/Minimap.jsx';
import EventLog from './components/EventLog.jsx';
import NotificationSystem from './components/NotificationSystem.jsx';
import DeathScreen from './components/DeathScreen.jsx';
import HoverTooltip from './components/HoverTooltip.jsx';
import Journal from './components/Journal.jsx';
import IntroOverlay from './components/IntroOverlay.jsx';
import Icon from './components/Icon.jsx';
import MobileHud from './components/MobileHud.jsx';
import BottomSheet from './components/BottomSheet.jsx';
import { areaInfo } from './components/CreaturesPanel.jsx';
import useMobile from './hooks/useMobile.js';

const TRAVEL_STEP_MS = 650;
const MAX_PATH = 40;

const isWalkable = (hex, weight) => {
    if (!hex || !hex.discovered) return false;
    const t = TERRAIN_TYPES[hex.terrain];
    if (!t.passable || hex.terrain === 'quicksand') return false;
    if (t.minWeight > 0 && weight < t.minWeight) return false;
    return true;
};

// Breadth-first path over discovered, safe terrain (cell keys)
const findPath = (cells, startKey, goalKey, weight) => {
    if (!isWalkable(cells.get(goalKey), weight)) return null;
    const prev = new Map([[startKey, null]]);
    const queue = [startKey];
    while (queue.length) {
        const ck = queue.shift();
        if (ck === goalKey) break;
        for (const nk of cells.get(ck).neighbors) {
            if (prev.has(nk) || !isWalkable(cells.get(nk), weight)) continue;
            prev.set(nk, ck);
            queue.push(nk);
        }
        if (prev.size > 4000) break;
    }
    if (!prev.has(goalKey)) return null;
    const path = [];
    for (let k = goalKey; k && k !== startKey; k = prev.get(k)) path.unshift(k);
    return path.length && path.length <= MAX_PATH ? path : null;
};

const BigAlHexGame = () => {
    const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [travelPath, setTravelPath] = useState([]);
    const [journalOpen, setJournalOpen] = useState(false);
    const [started, setStarted] = useState(() => new URLSearchParams(window.location.search).has('skipintro'));
    const [sleepFx, setSleepFx] = useState(null);
    const [hurtFx, setHurtFx] = useState(null);
    const [journalSeen, setJournalSeen] = useState(0);
    const mobile = useMobile();
    const [sheet, setSheet] = useState(null); // phone: 'area' | 'status' | 'map'
    const [hold, setHold] = useState(null); // phone: area info from press-and-hold
    const worldRef = useRef(null);
    const fitnessAtTravelStart = useRef(null);
    const lastFitness = useRef(gameState.fitness);

    // ============ WORLD GENERATION ============
    useEffect(() => {
        if (!gameState.mapGenerated) {
            const seed = Number(new URLSearchParams(window.location.search).get('seed')) || undefined;
            dispatch({ type: 'GENERATE_WORLD', seed });
        }
    }, [gameState.mapGenerated]);

    // Update visibility (and fill the visible area with wildlife) when the player moves
    useEffect(() => {
        if (!gameState.player) return;
        dispatch({ type: 'UPDATE_VISIBILITY' });
        dispatch({ type: 'POPULATE_NEARBY' });
    }, [gameState.player, gameState.worldSeed]);

    // Spawn creatures on your tile when moving to a new location
    useEffect(() => {
        if (gameState.moveNumber > 0 && gameState.gamePhase === 'exploring') {
            const id = setTimeout(() => dispatch({ type: 'SPAWN_CREATURES' }), 500);
            return () => clearTimeout(id);
        }
        return undefined;
    }, [gameState.player]);

    // Creatures keep living between your moves
    const hasCreatures = gameState.creatures.size > 0;
    useEffect(() => {
        if (gameState.gameOver || !hasCreatures) return undefined;
        const timer = setInterval(() => {
            if (Math.random() < 0.8) dispatch({ type: 'PROCESS_CREATURE_BEHAVIORS' });
        }, 4000);
        return () => clearInterval(timer);
    }, [gameState.gameOver, hasCreatures]);

    // ============ DEBUG HELPERS ============
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return undefined;
        window.listCreatures = () => {
            const all = [];
            for (const [hex, creatures] of gameState.creatures.entries()) creatures.forEach(c => all.push(`${c.species} at ${hex}`));
            console.log('🦖 Current creatures:', all);
            return all;
        };
        window.showBehaviorLog = () => gameState.creatureBehaviorLog;
        window.forceBehaviorUpdate = () => dispatch({ type: 'PROCESS_CREATURE_BEHAVIORS' });
        window.bigAl = { state: gameState, dispatch };
        window.spawnCreature = (species, hexKey, size) => dispatch({ type: 'DEBUG_SPAWN', species, hexKey, size });
        window.setStats = (patch) => dispatch({ type: 'DEBUG_SET', patch });
        // jump to the nearest cell of a terrain (e.g. teleport('galleryforest')), optionally setting the turn
        window.teleport = (terrain, turn) => {
            const here = gameState.cells.get(gameState.player);
            const target = [...gameState.cells.values()].filter((c) => c.terrain === terrain)
                .sort((a, b) => Math.hypot(a.x - here.x, a.z - here.z) - Math.hypot(b.x - here.x, b.z - here.z))[0];
            if (target) dispatch({ type: 'DEBUG_TELEPORT', key: target.key, turn });
            return target?.key;
        };
        return () => {
            delete window.listCreatures;
            delete window.showBehaviorLog;
            delete window.forceBehaviorUpdate;
            delete window.bigAl;
            delete window.spawnCreature;
            delete window.teleport;
            delete window.setStats;
        };
    }, [gameState]);

    // ============ MOVEMENT ============
    const movableHexes = useMemo(() => {
        if (gameState.gameOver) return [];
        const here = gameState.cells.get(gameState.player);
        if (!here) return [];
        return here.neighbors.filter(n => {
            const cell = gameState.cells.get(n);
            return cell && cell.discovered && TERRAIN_TYPES[cell.terrain].passable;
        });
    }, [gameState.player, gameState.cells, gameState.gameOver]);

    const handleHexClick = useCallback((key) => {
        const hex = gameState.cells.get(key);
        if (!hex || gameState.gameOver) return;
        const terrain = TERRAIN_TYPES[hex.terrain];

        if (key === gameState.player) {
            setTravelPath([]);
            dispatch({ type: 'SELECT_HEX', hex });
        } else if (areNeighbors(gameState.cells, gameState.player, key) && hex.discovered && terrain.passable) {
            setTravelPath([]);
            dispatch({ type: 'MOVE_PLAYER', target: key });
        } else {
            // NEW: click a far-away tile to walk there over safe, explored ground
            const path = hex.discovered ? findPath(gameState.cells, gameState.player, key, gameState.weight) : null;
            if (path) {
                fitnessAtTravelStart.current = gameState.fitness;
                setTravelPath(path);
            }
            dispatch({ type: 'SELECT_HEX', hex });
        }
    }, [gameState.cells, gameState.player, gameState.gameOver, gameState.weight, gameState.fitness]);

    const handleHexHover = useCallback((key) => {
        if (!key) {
            dispatch({ type: 'CLEAR_HOVER' });
            return;
        }
        const hex = gameState.cells.get(key);
        if (hex) dispatch({ type: 'HOVER_HEX', hex });
    }, [gameState.cells]);

    // Auto-travel along the chosen path, one step at a time. Stops when
    // something dangerous shows up, when hurt, or when getting hungry.
    useEffect(() => {
        if (!travelPath.length) return undefined;
        if (gameState.gameOver) {
            setTravelPath([]);
            return undefined;
        }
        const id = setTimeout(() => {
            const here = gameState.creatures.get(gameState.player) || [];
            const danger = here.some(c => {
                const sd = SPECIES_DATA[c.species];
                return sd && calculateFiercenessRatio(gameState.weight, gameState.fitness, sd, c.size, 1, false) >= 1;
            });
            const hurt = fitnessAtTravelStart.current !== null && gameState.fitness < fitnessAtTravelStart.current - 5;
            const next = travelPath[0];
            if (danger || hurt || gameState.energy < 20 || !areNeighbors(gameState.cells, gameState.player, next)) {
                setTravelPath([]);
                return;
            }
            dispatch({ type: 'MOVE_PLAYER', target: next });
            setTravelPath(travelPath.slice(1));
        }, TRAVEL_STEP_MS);
        return () => clearTimeout(id);
    }, [travelPath, gameState.player, gameState.gameOver]);

    // Path preview to the hovered tile
    const previewPath = useMemo(() => {
        if (travelPath.length) return travelPath;
        const h = gameState.hoveredHex;
        if (!h || gameState.gameOver || h.key === gameState.player || areNeighbors(gameState.cells, gameState.player, h.key)) return [];
        return findPath(gameState.cells, gameState.player, h.key, gameState.weight) || [];
    }, [travelPath, gameState.hoveredHex, gameState.player, gameState.cells, gameState.weight, gameState.gameOver]);

    // ============ HOTKEYS ============
    useEffect(() => {
        const onKey = (e) => {
            if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            if (!started || gameState.gameOver) return;
            const k = e.key.toLowerCase();
            if (k === 'j') {
                setJournalOpen((o) => !o);
                return;
            }
            if (journalOpen) return;
            if (/^[1-6]$/.test(k) && actionHotkeys(gameState, dispatch, k)) setTravelPath([]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [gameState, started, journalOpen]);

    // ============ SCREEN EFFECTS ============
    useEffect(() => {
        const a = gameState.lastPlayerAction;
        if (a?.type === 'sleep') setSleepFx(a.id);
    }, [gameState.lastPlayerAction]);
    useEffect(() => {
        if (gameState.fitness < lastFitness.current - 0.5) setHurtFx(`${gameState.moveNumber}-${gameState.fitness}`);
        lastFitness.current = gameState.fitness;
    }, [gameState.fitness, gameState.moveNumber]);
    useEffect(() => {
        if (!sleepFx) return undefined;
        const id = setTimeout(() => setSleepFx(null), 2300);
        return () => clearTimeout(id);
    }, [sleepFx]);

    const journalCount = Object.keys(gameState.journal.species).length + Object.keys(gameState.journal.landmarks).length;
    const openJournal = () => {
        setJournalOpen(true);
        setJournalSeen(journalCount);
    };

    // phone: press and hold an area to see what is there
    const handleHexHold = useCallback((key, x, y) => setHold({ key, x, y }), []);
    const handleTouchStart = useCallback(() => setHold(null), []);
    useEffect(() => {
        if (!hold) return undefined;
        const id = setTimeout(() => setHold(null), 5000);
        return () => clearTimeout(id);
    }, [hold]);
    const area = areaInfo(gameState);
    // keep Spino in view above the animal sheet
    useEffect(() => {
        worldRef.current?.shift(mobile && sheet === 'area' ? 0.26 : 0);
    }, [mobile, sheet]);
    const heldHex = hold ? gameState.cells.get(hold.key) : null;

    const hoveredCreatures = gameState.hoveredHex && gameState.cells.get(gameState.hoveredHex.key)?.inSight
        ? gameState.creatures.get(gameState.hoveredHex.key)
        : null;
    const camera = {
        rotate: (d) => worldRef.current?.rotate(d),
        zoom: (f) => worldRef.current?.zoom(f),
        center: () => worldRef.current?.center(),
        look: (x, z) => worldRef.current?.lookAt(x, z)
    };

    return (
        <div
            className="w-full relative overflow-hidden"
            style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', background: '#0d100c', height: '100dvh' }}
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        >
            {/* 3D world */}
            <WorldView
                ref={worldRef}
                gameState={gameState}
                movable={movableHexes}
                path={previewPath}
                onHexClick={handleHexClick}
                onHexHover={handleHexHover}
                onHexHold={handleHexHold}
                onTouchStart={handleTouchStart}
            />

            {sleepFx && (
                <div key={sleepFx} className="sleep-overlay flex items-center justify-center">
                    <span className="panel-title text-[40px] text-[#c8d0ff] opacity-80 anim-bob">z z z</span>
                </div>
            )}
            {hurtFx && <div key={hurtFx} className="hurt-flash" />}

            {started && mobile && (
                <>
                    <MobileHud gameState={gameState} onOpen={() => setSheet('status')} />
                    <div className="absolute inset-x-2 flex flex-col items-center pointer-events-none z-[41]" style={{ top: 'calc(max(8px, env(safe-area-inset-top)) + 64px)' }}>
                        <NotificationSystem gameState={gameState} dispatch={dispatch} />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 px-2 safe-bottom flex flex-col gap-1.5 pointer-events-none z-[40]">
                        <div className="flex items-end justify-between gap-2">
                            <div className="flex gap-1.5 pointer-events-auto">
                                <button type="button" className="btn panel fab" onClick={() => setSheet('map')} aria-label="Map"><Icon name="map" size={16} /></button>
                                <button type="button" className="btn panel fab" onClick={camera.center} aria-label="Centre on Spino"><Icon name="target" size={16} /></button>
                            </div>
                            {!gameState.gameOver && area.any && (
                                <button type="button" className={`btn panel fab pointer-events-auto ${area.danger ? 'danger' : ''}`} onClick={() => setSheet('area')}>
                                    <Icon name={area.danger ? 'warn' : 'paw'} size={16} />
                                    {area.count > 0 ? `${area.count} here` : area.danger ? 'Danger' : 'Look'}
                                </button>
                            )}
                        </div>
                        {!gameState.gameOver && gameState.currentThought && (
                            <div className="panel px-3 py-1.5 text-center anim-fade self-center max-w-full" key={gameState.currentThought}>
                                <span className="italic text-[12.5px] text-ink">{gameState.currentThought}</span>
                                {travelPath.length > 0 && <span className="text-[11.5px] ml-2" style={{ color: 'var(--accent)' }}>{travelPath.length} to go</span>}
                                {gameState.dashArmed && <span className="text-[11.5px] ml-2 font-semibold" style={{ color: 'var(--accent)' }}>Dash ready: tap an area</span>}
                            </div>
                        )}
                        <div className="pointer-events-auto"><ActionBar compact gameState={gameState} dispatch={dispatch} onJournal={openJournal} journalNew={journalCount > journalSeen} /></div>
                    </div>

                    <BottomSheet open={sheet === 'area'} onClose={() => setSheet(null)} title={gameState.cells.get(gameState.player) ? TERRAIN_TYPES[gameState.cells.get(gameState.player).terrain].name : 'Your area'} height="58dvh">
                        {area.any ? <CreaturesPanel sheet gameState={gameState} dispatch={dispatch} /> : <div className="text-[13px] text-ink-muted p-2">Nothing here now.</div>}
                    </BottomSheet>
                    <BottomSheet open={sheet === 'status'} onClose={() => setSheet(null)} title="Status and goals" height="80dvh" dim>
                        <StatusPanel sheet gameState={gameState} />
                    </BottomSheet>
                    <BottomSheet open={sheet === 'map'} onClose={() => setSheet(null)} title="Map" height="85dvh" dim>
                        <div className="flex flex-col items-center gap-2">
                            <Minimap gameState={gameState} camera={camera} onLook={(x, z) => { camera.look(x, z); setSheet(null); }} />
                            <EventLog gameState={gameState} />
                        </div>
                    </BottomSheet>

                    {heldHex && !journalOpen && (
                        <HoverTooltip hex={heldHex} mousePos={{ x: hold.x, y: hold.y }} creatures={heldHex.inSight ? gameState.creatures.get(hold.key) : null} gameState={gameState} pathLength={0} />
                    )}
                    {journalOpen && <Journal gameState={gameState} onClose={() => setJournalOpen(false)} />}
                    <DeathScreen gameState={gameState} dispatch={dispatch} />
                </>
            )}
            {started && !mobile && (
                <>
                    <div className="absolute top-4 left-4 pointer-events-auto"><StatusPanel gameState={gameState} /></div>
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
                        <div className="pointer-events-auto"><TimeWidget gameState={gameState} /></div>
                        <NotificationSystem gameState={gameState} dispatch={dispatch} />
                    </div>
                    <div className="absolute top-4 right-4"><CreaturesPanel gameState={gameState} dispatch={dispatch} /></div>
                    <div className="absolute bottom-4 left-4 hidden md:block"><Minimap gameState={gameState} camera={camera} onLook={camera.look} /></div>
                    <div className="absolute bottom-4 right-4 hidden xl:block"><EventLog gameState={gameState} /></div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5">
                        {!gameState.gameOver && gameState.currentThought && (
                            <div className="panel px-4 py-2 max-w-[560px] text-center pointer-events-none anim-fade" key={gameState.currentThought}>
                                <span className="italic text-[14px] text-ink">{gameState.currentThought}</span>
                                {travelPath.length > 0 && <span className="text-[12px] ml-2" style={{ color: 'var(--accent)' }}>Travelling, {travelPath.length} to go</span>}
                                {gameState.dashArmed && <span className="text-[12px] ml-2 font-semibold" style={{ color: 'var(--accent)' }}><Icon name="dash" size={12} className="inline -mt-0.5" /> Dash ready</span>}
                            </div>
                        )}
                        <ActionBar gameState={gameState} dispatch={dispatch} onJournal={openJournal} journalNew={journalCount > journalSeen} />
                    </div>

                    {!journalOpen && <HoverTooltip hex={gameState.hoveredHex} mousePos={mousePos} creatures={hoveredCreatures} gameState={gameState} pathLength={previewPath.length} />}
                    {journalOpen && <Journal gameState={gameState} onClose={() => setJournalOpen(false)} />}
                    <DeathScreen gameState={gameState} dispatch={dispatch} />
                </>
            )}
            {!started && <IntroOverlay mobile={mobile} onStart={() => setStarted(true)} />}
        </div>
    );
};

export default BigAlHexGame;
