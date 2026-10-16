import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";
import type { Theme } from "../hooks/useTheme";

function CareerOrb({ theme }: { theme: Theme }) {
  const ref = useRef<Mesh>(null);
  const primary = theme === "dark" ? "#818cf8" : "#6366f1";
  const secondary = theme === "dark" ? "#2dd4bf" : "#14b8a6";

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.15;
  });

  return (
    <Float speed={1.8} rotationIntensity={0.35} floatIntensity={0.6}>
      <Sphere ref={ref} args={[1.2, 64, 64]} scale={1.6}>
        <MeshDistortMaterial color={primary} distort={0.28} speed={1.2} roughness={0.15} metalness={0.25} />
      </Sphere>
      <Sphere args={[0.55, 32, 32]} position={[1.8, 0.6, 0.5]}>
        <MeshDistortMaterial color={secondary} distort={0.2} speed={2} roughness={0.2} metalness={0.3} />
      </Sphere>
    </Float>
  );
}

type Scene3DProps = {
  className?: string;
  theme: Theme;
};

export function Scene3D({ className, theme }: Scene3DProps) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5.5], fov: 42 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={theme === "dark" ? 0.85 : 1.1} />
        <directionalLight position={[5, 5, 4]} intensity={theme === "dark" ? 1.1 : 1.4} color="#ffffff" />
        <pointLight position={[-4, -2, 2]} intensity={0.6} color={theme === "dark" ? "#5eead4" : "#99f6e4"} />
        <CareerOrb theme={theme} />
      </Canvas>
    </div>
  );
}
