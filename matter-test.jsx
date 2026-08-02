import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import Matter from "matter-js";
import "./matter-test.css";

const { Bodies, Body, Composite, Engine, World } = Matter;

const COLORS = ["#ff3b1f", "#00d9ff", "#ff0095", "#713cff", "#00e676", "#ffd500"];
const WIDTH = 760;
const HEIGHT = 520;
const AIR_FORCE = 0.00056;
const TURBULENCE = 0.0002;

function MatterAirMixLab() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const addBallRef = useRef(null);
  const [ballCount, setBallCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const dpr = Math.max(2, window.devicePixelRatio || 1);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    context.scale(dpr, dpr);

    const engine = Engine.create({ enableSleeping: false });
    engine.gravity.y = 0.34;
    engineRef.current = engine;

    // Paredes invisibles que forman el laboratorio rectangular.
    const walls = [
      Bodies.rectangle(WIDTH / 2, HEIGHT + 18, WIDTH, 36, { isStatic: true }),
      Bodies.rectangle(-18, HEIGHT / 2, 36, HEIGHT, { isStatic: true }),
      Bodies.rectangle(WIDTH + 18, HEIGHT / 2, 36, HEIGHT, { isStatic: true }),
      Bodies.rectangle(WIDTH / 2, -18, WIDTH, 36, { isStatic: true })
    ];
    World.add(engine.world, walls);

    const addBall = (number = Composite.allBodies(engine.world).length) => {
      const color = COLORS[number % COLORS.length];
      const ball = Bodies.circle(WIDTH / 2 + (Math.random() - 0.5) * 70, HEIGHT * 0.68, 23, {
        restitution: 0.94,
        friction: 0.002,
        frictionAir: 0.006,
        density: 0.0018,
        label: `ball:${number}`,
        render: { fillStyle: color }
      });
      ball.plugin = { color, number: String(number).slice(-2) };
      World.add(engine.world, ball);
      setBallCount(Composite.allBodies(engine.world).filter(body => body.label.startsWith("ball:")).length);
    };
    addBallRef.current = addBall;

    for (let number = 1; number <= 12; number += 1) addBall(number);

    let frameId;
    let previous = performance.now();

    const drawBall = body => {
      const { x, y } = body.position;
      const radius = body.circleRadius;
      const color = body.plugin.color;
      const gradient = context.createRadialGradient(x - 8, y - 9, 3, x, y, radius);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.16, color);
      gradient.addColorStop(1, "#07113c");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2.5;
      context.stroke();
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(x, y, radius * 0.53, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#07113c";
      context.font = '900 13px "Arial Black", sans-serif';
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(body.plugin.number, x, y + 1);
    };

    const animate = now => {
      // Matter.js es más estable con un timestep máximo de 60 FPS.
      const delta = Math.min(16.666, Math.max(1, now - previous));
      previous = now;
      const balls = Composite.allBodies(engine.world).filter(body => body.label.startsWith("ball:"));

      // Matter.js recibe una fuerza ascendente y turbulencia nueva en cada frame.
      balls.forEach((ball, index) => {
        const centrality = 1 - Math.min(1, Math.abs(ball.position.x - WIDTH / 2) / (WIDTH / 2));
        Body.applyForce(ball, ball.position, {
          x: Math.sin(now * 0.0021 + index) * TURBULENCE * ball.mass,
          y: -AIR_FORCE * (0.5 + centrality) * ball.mass
        });
      });

      Engine.update(engine, delta);
      context.clearRect(0, 0, WIDTH, HEIGHT);
      context.fillStyle = "#07113c";
      context.fillRect(0, 0, WIDTH, HEIGHT);

      const glow = context.createRadialGradient(WIDTH / 2, HEIGHT, 20, WIDTH / 2, HEIGHT, 340);
      glow.addColorStop(0, "rgba(0,217,255,.22)");
      glow.addColorStop(1, "rgba(0,217,255,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, WIDTH, HEIGHT);
      balls.forEach(drawBall);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      addBallRef.current = null;
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);

  const addBall = useCallback(() => {
    if (addBallRef.current) addBallRef.current(ballCount + 1);
  }, [ballCount]);

  return (
    <main className="lab-page">
      <motion.section
        className="lab-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <header>
          <span className="lab-kicker">Matter.js + React</span>
          <h1>Laboratorio <em>Air‑Mix</em></h1>
          <p>Prueba mínima con `useEffect`, `requestAnimationFrame` y Framer Motion.</p>
        </header>

        <div className="canvas-shell">
          <canvas ref={canvasRef} aria-label="Simulación Matter.js con bolas suspendidas por aire" />
          <span className="live-chip">{ballCount} cuerpos activos</span>
        </div>

        <motion.button whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={addBall}>
          Agregar bolita Matter.js <span>+</span>
        </motion.button>
      </motion.section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MatterAirMixLab />
  </React.StrictMode>
);
