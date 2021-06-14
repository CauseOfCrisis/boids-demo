import Boids from "@components/Boids.js";

import { Canvas } from "@react-three/fiber";

import styles from "@styles/BoidsScene.module.css";

const BoidsScene = () => {
  return (
    <div className={styles.container}>
      <Canvas camera={{ position: [0, 20, 65] }}>
        <ambientLight intensity={0.1} />
        <directionalLight position={[0, 0, 5]} />
        <Boids numBoids={50} boxSize={[50, 50, 50]} />
      </Canvas>
    </div>
  );
};

export default BoidsScene;
