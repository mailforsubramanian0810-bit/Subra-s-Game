
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Coin, CoinType, Vector } from '../types';
import { 
  BOARD_SIZE, 
  COLORS, 
  POCKET_RADIUS, 
  FRICTION, 
  WALL_BOUNCE, 
  MIN_VELOCITY 
} from '../constants';

interface BoardProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  aiSuggestion: { angle: number, power: number } | null;
  boardTheme: string | null;
}

const Board: React.FC<BoardProps> = ({ gameState, setGameState, aiSuggestion, boardTheme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [dragStart, setDragStart] = useState<Vector | null>(null);
  const [currentDrag, setCurrentDrag] = useState<Vector | null>(null);
  const [strikerX, setStrikerX] = useState(BOARD_SIZE / 2);

  // Drawing helpers
  const drawBoard = (ctx: CanvasRenderingContext2D) => {
    // Background
    if (boardTheme) {
      const img = new Image();
      img.src = boardTheme;
      ctx.drawImage(img, 0, 0, BOARD_SIZE, BOARD_SIZE);
      // Add a subtle overlay to keep gameplay clear
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0,0,BOARD_SIZE, BOARD_SIZE);
    } else {
      ctx.fillStyle = COLORS.BOARD_BASE;
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
      
      // Basic lines
      ctx.strokeStyle = COLORS.BOARD_LINES;
      ctx.lineWidth = 2;
      
      // Baselines
      const offset = 100;
      ctx.strokeRect(offset, offset, BOARD_SIZE - 2 * offset, BOARD_SIZE - 2 * offset);
      ctx.strokeRect(offset + 20, offset + 20, BOARD_SIZE - 2 * offset - 40, BOARD_SIZE - 2 * offset - 40);
      
      // Center circles
      ctx.beginPath();
      ctx.arc(BOARD_SIZE / 2, BOARD_SIZE / 2, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(BOARD_SIZE / 2, BOARD_SIZE / 2, 80, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Pockets
    ctx.fillStyle = COLORS.POCKET;
    const pockets = [
      { x: 0, y: 0 }, { x: BOARD_SIZE, y: 0 },
      { x: 0, y: BOARD_SIZE }, { x: BOARD_SIZE, y: BOARD_SIZE }
    ];
    pockets.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawCoin = (ctx: CanvasRenderingContext2D, coin: Coin) => {
    if (coin.inPocket) return;

    ctx.save();
    ctx.translate(coin.pos.x, coin.pos.y);
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(2, 2, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    // Body
    let color = COLORS.WHITE_COIN;
    if (coin.type === CoinType.BLACK) color = COLORS.BLACK_COIN;
    if (coin.type === CoinType.QUEEN) color = COLORS.QUEEN_COIN;
    if (coin.type === CoinType.STRIKER) color = COLORS.STRIKER;

    const grad = ctx.createRadialGradient(-coin.radius/3, -coin.radius/3, 0, 0, 0, coin.radius);
    grad.addColorStop(0, '#ffffff44');
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Shine / Detail
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    if (coin.type === CoinType.STRIKER) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    ctx.restore();
  };

  // Physics Logic
  const resolveCollision = (c1: Coin, c2: Coin) => {
    const dx = c2.pos.x - c1.pos.x;
    const dy = c2.pos.y - c1.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < c1.radius + c2.radius) {
      // Overlap correction
      const overlap = (c1.radius + c2.radius - distance) / 2;
      const nx = dx / distance;
      const ny = dy / distance;
      
      c1.pos.x -= nx * overlap;
      c1.pos.y -= ny * overlap;
      c2.pos.x += nx * overlap;
      c2.pos.y += ny * overlap;

      // Elastic collision
      const v1n = c1.vel.x * nx + c1.vel.y * ny;
      const v2n = c2.vel.x * nx + c2.vel.y * ny;

      const m1 = c1.mass;
      const m2 = c2.mass;

      const newV1n = (v1n * (m1 - m2) + 2 * m2 * v2n) / (m1 + m2);
      const newV2n = (v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2);

      c1.vel.x += (newV1n - v1n) * nx;
      c1.vel.y += (newV1n - v1n) * ny;
      c2.vel.x += (newV2n - v2n) * nx;
      c2.vel.y += (newV2n - v2n) * ny;
    }
  };

  const updatePhysics = useCallback(() => {
    setGameState(prev => {
      if (!prev.isMoving) return prev;

      let anyMoving = false;
      const nextCoins = prev.coins.map(c => ({ ...c }));
      const nextStriker = { ...prev.striker };
      const allBodies = [nextStriker, ...nextCoins];

      allBodies.forEach(b => {
        if (b.inPocket) return;

        // Apply velocity
        b.pos.x += b.vel.x;
        b.pos.y += b.vel.y;

        // Friction
        b.vel.x *= FRICTION;
        b.vel.y *= FRICTION;

        if (Math.abs(b.vel.x) < MIN_VELOCITY) b.vel.x = 0;
        if (Math.abs(b.vel.y) < MIN_VELOCITY) b.vel.y = 0;

        if (b.vel.x !== 0 || b.vel.y !== 0) anyMoving = true;

        // Wall collisions
        if (b.pos.x - b.radius < 0) {
          b.pos.x = b.radius;
          b.vel.x *= -WALL_BOUNCE;
        } else if (b.pos.x + b.radius > BOARD_SIZE) {
          b.pos.x = BOARD_SIZE - b.radius;
          b.vel.x *= -WALL_BOUNCE;
        }
        if (b.pos.y - b.radius < 0) {
          b.pos.y = b.radius;
          b.vel.y *= -WALL_BOUNCE;
        } else if (b.pos.y + b.radius > BOARD_SIZE) {
          b.pos.y = BOARD_SIZE - b.radius;
          b.vel.y *= -WALL_BOUNCE;
        }

        // Pocket detection
        const pockets = [
          { x: 0, y: 0 }, { x: BOARD_SIZE, y: 0 },
          { x: 0, y: BOARD_SIZE }, { x: BOARD_SIZE, y: BOARD_SIZE }
        ];
        pockets.forEach(p => {
          const dx = b.pos.x - p.x;
          const dy = b.pos.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS) {
            b.inPocket = true;
            b.vel = { x: 0, y: 0 };
          }
        });
      });

      // Body-Body collisions
      for (let i = 0; i < allBodies.length; i++) {
        for (let j = i + 1; j < allBodies.length; j++) {
          if (!allBodies[i].inPocket && !allBodies[j].inPocket) {
            resolveCollision(allBodies[i], allBodies[j]);
          }
        }
      }

      // Handle scoring and turn logic when stopped
      if (!anyMoving) {
        let scoreUpdate = { ...prev.score };
        let nextTurn = prev.turn === 'white' ? 'black' : 'white';
        let foul = false;

        if (nextStriker.inPocket) {
            foul = true;
            // penalty: return one coin of player's color if possible
        }

        const pocketedThisTurn = nextCoins.filter((c, idx) => c.inPocket && !prev.coins[idx].inPocket);
        
        if (pocketedThisTurn.length > 0) {
            // Player gets another turn if they pocketed their own color or the queen
            pocketedThisTurn.forEach(c => {
                if (c.type === CoinType.QUEEN) {
                    // logic for queen cover needed here
                } else if ((c.type === CoinType.WHITE && prev.turn === 'white') || (c.type === CoinType.BLACK && prev.turn === 'black')) {
                    nextTurn = prev.turn;
                    if (c.type === CoinType.WHITE) scoreUpdate.white += 20;
                    else scoreUpdate.black += 10;
                }
            });
        }

        // Reset striker
        nextStriker.inPocket = false;
        nextStriker.pos = { x: BOARD_SIZE / 2, y: BOARD_SIZE - 120 };
        nextStriker.vel = { x: 0, y: 0 };

        return {
          ...prev,
          coins: nextCoins,
          striker: nextStriker,
          score: scoreUpdate,
          turn: nextTurn,
          isMoving: false,
          strikerPositioned: false,
        };
      }

      return {
        ...prev,
        coins: nextCoins,
        striker: nextStriker,
        isMoving: anyMoving,
      };
    });
  }, [setGameState]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
      drawBoard(ctx);
      
      gameState.coins.forEach(c => drawCoin(ctx, c));
      drawCoin(ctx, gameState.striker);

      // Drag line
      if (dragStart && currentDrag && !gameState.isMoving) {
        ctx.beginPath();
        ctx.moveTo(gameState.striker.pos.x, gameState.striker.pos.y);
        ctx.lineTo(currentDrag.x, currentDrag.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Power indicator
        const dist = Math.sqrt(Math.pow(dragStart.x - currentDrag.x, 2) + Math.pow(dragStart.y - currentDrag.y, 2));
        const power = Math.min(dist / 5, 25);
        ctx.beginPath();
        ctx.arc(gameState.striker.pos.x, gameState.striker.pos.y, gameState.striker.radius + 10, 0, (Math.PI * 2 * power) / 25);
        ctx.strokeStyle = `hsl(${120 - (power * 4)}, 100%, 50%)`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // AI Suggestion Visual
      if (aiSuggestion && !gameState.isMoving) {
          const angleRad = (aiSuggestion.angle * Math.PI) / 180;
          const targetX = gameState.striker.pos.x + Math.cos(angleRad) * 100;
          const targetY = gameState.striker.pos.y + Math.sin(angleRad) * 100;
          
          ctx.beginPath();
          ctx.moveTo(gameState.striker.pos.x, gameState.striker.pos.y);
          ctx.lineTo(targetX, targetY);
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
      }

      if (gameState.isMoving) {
        updatePhysics();
      }
      
      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationRef.current!);
  }, [gameState, dragStart, currentDrag, updatePhysics, aiSuggestion, boardTheme]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.isMoving) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    if (!gameState.strikerPositioned) {
        // Just moving the striker horizontally on the baseline
        const baselineY = BOARD_SIZE - 120;
        if (Math.abs(y - baselineY) < 50) {
            setGameState(prev => ({
                ...prev,
                striker: { ...prev.striker, pos: { x: Math.max(120, Math.min(BOARD_SIZE - 120, x)), y: baselineY } }
            }));
        }
    } else {
        setDragStart({ x, y });
        setCurrentDrag({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.isMoving) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    if (!gameState.strikerPositioned) {
        const baselineY = BOARD_SIZE - 120;
        if (Math.abs(y - baselineY) < 50) {
            setGameState(prev => ({
                ...prev,
                striker: { ...prev.striker, pos: { x: Math.max(120, Math.min(BOARD_SIZE - 120, x)), y: baselineY } }
            }));
        }
    } else if (dragStart) {
        setCurrentDrag({ x, y });
    }
  };

  const handleMouseUp = () => {
    if (!gameState.strikerPositioned) {
        setGameState(prev => ({ ...prev, strikerPositioned: true }));
        return;
    }

    if (dragStart && currentDrag) {
      const dx = dragStart.x - currentDrag.x;
      const dy = dragStart.y - currentDrag.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(dist / 5, 25);
      
      const angle = Math.atan2(dy, dx);
      
      setGameState(prev => ({
        ...prev,
        isMoving: true,
        striker: {
          ...prev.striker,
          vel: {
            x: Math.cos(angle) * power,
            y: Math.sin(angle) * power
          }
        }
      }));
      setDragStart(null);
      setCurrentDrag(null);
    }
  };

  return (
    <div className="relative cursor-crosshair group">
        <canvas
            ref={canvasRef}
            width={BOARD_SIZE}
            height={BOARD_SIZE}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            className="max-w-full max-h-[80vh] block"
        />
        {!gameState.strikerPositioned && !gameState.isMoving && (
            <div className="absolute inset-x-0 bottom-[130px] flex justify-center pointer-events-none">
                <div className="bg-white/10 backdrop-blur-sm px-4 py-1 rounded-full text-white text-sm font-bold animate-bounce border border-white/20">
                    SLIDE TO POSITION STRIKER, THEN TAP
                </div>
            </div>
        )}
        {gameState.strikerPositioned && !dragStart && !gameState.isMoving && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="bg-white/10 backdrop-blur-sm px-4 py-1 rounded-full text-white text-sm font-bold animate-pulse border border-white/20">
                    DRAG BACKWARDS TO AIM & SHOOT
                </div>
            </div>
        )}
    </div>
  );
};

export default Board;
