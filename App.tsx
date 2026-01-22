
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Board from './components/Board';
import GameUI from './components/GameUI';
import { GameState, CoinType, Coin } from './types';
import { INITIAL_POSITIONS, BOARD_SIZE, COIN_RADIUS, STRIKER_RADIUS } from './constants';
import { getMoveSuggestion, generateBoardTheme } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    coins: INITIAL_POSITIONS.map((pos, i) => ({
      id: `coin-${i}`,
      type: pos.type as CoinType,
      pos: { x: BOARD_SIZE / 2 + pos.x, y: BOARD_SIZE / 2 + pos.y },
      vel: { x: 0, y: 0 },
      radius: COIN_RADIUS,
      mass: 1,
      inPocket: false,
    })),
    striker: {
      id: 'striker',
      type: CoinType.STRIKER,
      pos: { x: BOARD_SIZE / 2, y: BOARD_SIZE - 120 },
      vel: { x: 0, y: 0 },
      radius: STRIKER_RADIUS,
      mass: 1.5,
      inPocket: false,
    },
    score: { white: 0, black: 0 },
    turn: 'white',
    isMoving: false,
    strikerPositioned: false,
    queenPocketedBy: null,
    needsCover: false,
  });

  const [aiSuggestion, setAiSuggestion] = useState<{angle: number, power: number, explanation: string} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [boardTheme, setBoardTheme] = useState<string | null>(null);
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const suggestion = await getMoveSuggestion(gameState);
    setAiSuggestion(suggestion);
    setIsAnalyzing(false);
  };

  const handleGenerateTheme = async () => {
    setIsGeneratingTheme(true);
    const themeUrl = await generateBoardTheme("A top-down, hyper-realistic 3D render of a professional tournament-grade Carrom board. The wood is polished rosewood with a slight sheen. Soft studio lighting, sharp focus on the wood grain, 8k resolution, cinematic sports photography style.");
    if (themeUrl) setBoardTheme(themeUrl);
    setIsGeneratingTheme(false);
  };

  const resetGame = () => {
    setGameState({
      coins: INITIAL_POSITIONS.map((pos, i) => ({
        id: `coin-${i}`,
        type: pos.type as CoinType,
        pos: { x: BOARD_SIZE / 2 + pos.x, y: BOARD_SIZE / 2 + pos.y },
        vel: { x: 0, y: 0 },
        radius: COIN_RADIUS,
        mass: 1,
        inPocket: false,
      })),
      striker: {
        id: 'striker',
        type: CoinType.STRIKER,
        pos: { x: BOARD_SIZE / 2, y: BOARD_SIZE - 120 },
        vel: { x: 0, y: 0 },
        radius: STRIKER_RADIUS,
        mass: 1.5,
        inPocket: false,
      },
      score: { white: 0, black: 0 },
      turn: 'white',
      isMoving: false,
      strikerPositioned: false,
      queenPocketedBy: null,
      needsCover: false,
    });
    setAiSuggestion(null);
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Header Info */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl pointer-events-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent">
            CARROM ELITE AI
          </h1>
          <div className="mt-2 flex gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">White</span>
              <span className="text-xl font-mono text-white">{gameState.score.white}</span>
            </div>
            <div className="border-r border-slate-700" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Black</span>
              <span className="text-xl font-mono text-white">{gameState.score.black}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pointer-events-auto">
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || gameState.isMoving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-4 py-2 rounded-lg transition-all shadow-lg active:scale-95"
          >
            {isAnalyzing ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-brain" />}
            Analyze Move
          </button>
          <button 
             onClick={handleGenerateTheme}
             disabled={isGeneratingTheme}
             className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg active:scale-95"
          >
            {isGeneratingTheme ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-paint-brush" />}
            Generate Theme
          </button>
          <button 
             onClick={resetGame}
             className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg active:scale-95"
          >
            <i className="fas fa-redo" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Game Board Area */}
      <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden border-[12px] border-[#3d2b1f]">
        <Board 
          gameState={gameState} 
          setGameState={setGameState} 
          aiSuggestion={aiSuggestion}
          boardTheme={boardTheme}
        />
      </div>

      {/* AI Suggestion Tooltip */}
      {aiSuggestion && !gameState.isMoving && (
        <div className="mt-6 bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 p-4 rounded-xl max-w-md animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <i className="fas fa-robot" />
            <span className="font-bold text-sm uppercase tracking-wider">AI Tactical Analysis</span>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">
            {aiSuggestion.explanation}
          </p>
          <div className="mt-2 text-xs text-slate-500 italic">
            Target Angle: {aiSuggestion.angle.toFixed(1)}° | Power: {aiSuggestion.power}%
          </div>
        </div>
      )}

      {/* Turn Indicator */}
      <div className="mt-4 flex items-center gap-3">
        <div className={`px-4 py-1 rounded-full text-sm font-bold transition-all ${gameState.turn === 'white' ? 'bg-white text-slate-900 ring-4 ring-white/20' : 'bg-slate-800 text-slate-500'}`}>
          WHITE TURN
        </div>
        <div className={`px-4 py-1 rounded-full text-sm font-bold transition-all ${gameState.turn === 'black' ? 'bg-black text-white ring-4 ring-black/20 border border-slate-700' : 'bg-slate-800 text-slate-500'}`}>
          BLACK TURN
        </div>
      </div>
    </div>
  );
};

export default App;
