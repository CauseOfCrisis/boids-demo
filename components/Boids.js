import { Canvas, useFrame } from "@react-three/fiber";
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { Vector3 } from "three";

const physicsFramerate = 50;
const physicsInverval = 1000 / physicsFramerate; //20 frames per sec. 1000 milliseconds is a second. 20 1000/20= 50
const deltaSecs = 1 / physicsFramerate;
const minVelocity = 15;
const maxVelocity = 30;
const maxForce = 100;

function BoundingBox(props) {
  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(...props.size)]} />
      <lineBasicMaterial
        args={[
          {
            color: "#0000FF",
            linewidth: 1,
            linecap: "round",
          },
        ]}
      />
    </lineSegments>
  );
}

const Boids = (props) => {
  const components = {
    meshComponent: [],
    meshRef: [],
    position: [],
    direction: [],
    velocity: [],
    acceleration: [],
    axesHelper: [],
  };

  const axesGroup = useRef(); //*Add all three axesHelper objects to axesGroup. Do elements inside get added automatically?
  const ax = <group ref={axesGroup} />;

  for (let i = 0; i < props.numBoids; i++) {
    components.meshRef[i] = useRef(); // ? Why does this work when it's not top-level of the component?

    components.axesHelper[i] = new THREE.AxesHelper(3); //? I guess I have to add with useEffect?

    components.position[i] = new THREE.Vector3(
      ...Array(3)
        .fill()
        .map(() => THREE.MathUtils.randFloatSpread(45))
    );

    const theta = THREE.MathUtils.randFloatSpread(Math.PI * 2); // TODO: (Refactor) Implement Gaussian Distribution Instead
    const phi = THREE.MathUtils.randFloatSpread(Math.PI * 2);
    components.direction[i] = new THREE.Vector3(
      Math.cos(theta) * Math.cos(phi),
      Math.cos(theta) * Math.sin(phi),
      Math.sin(theta)
    );

    components.velocity[i] = components.direction[i]
      .clone()
      .multiplyScalar(
        THREE.MathUtils.randFloatSpread(Math.abs(maxVelocity - minVelocity)) +
          minVelocity
      ); // Scale direction by random num between minVelocity and maxVelocity

    components.acceleration[i] = new THREE.Vector3(0, 0, 0);

    components.meshComponent[i] = (
      <mesh //? Should I just get the group reference instead, then append the meshes manually? Probably...
        ref={components.meshRef[i]}
        position={components.position[i].toArray([])}
        key={i}
        // TODO: up={[0, 0, 0]} --Change up vector so cone points to direction of travel... Can also rotate velocity instead
      >
        <coneGeometry args={[0.5, 2, 30, 1]} />
        <meshStandardMaterial args={[{ color: "#FF0000" }]} />
      </mesh>
    );
  }

  // useEffect(() => {
  //   //I think something sneaky is going on here.
  //   for (let i = 0; i < props.numBoids; i++) {
  //     axesGroup.current.add(components.axesHelper[i]);
  //   }
  // }, []);

  setInterval(() => {
    //* The Physics Loop!
    // TODO: Run when mounted ( Replace with useEffect(foo, []) ?)
    let pos;
    let dir;
    let vel;
    let accl;

    let dirAvg;

    for (let i = 0; i < props.numBoids; i++) {
      pos = components.position[i];
      dir = components.direction[i];
      vel = components.velocity[i];
      accl = components.acceleration[i];

      //* ALIGNMENT
      dirAvg = new THREE.Vector3(0, 0, 0);
      let total = 0;
      for (let j = 0; j < props.numBoids; j++) {
        const diff = components.position[j].clone().sub(pos);
        if (i != j && Math.sqrt(diff.dot(diff)) <= 8) {
          dirAvg.add(components.velocity[j]);
          total++;
        }
      }

      accl.set(0, 0, 0);
      if (total > 0) {
        dirAvg.divideScalar(total);
        dirAvg.normalize().multiplyScalar(maxVelocity);
        dirAvg.sub(vel); //Subtract current velocity from desired direction. This corresponds to
        let steerMag = Math.sqrt(dirAvg.dot(dirAvg));
        if (steerMag > maxForce) {
          dirAvg.normalize().multiplyScalar(maxForce);
        }
        accl.add(dirAvg.multiplyScalar(0.8));
      }

      //* SEPARATION
      total = 0;
      let steering = new THREE.Vector3(0, 0, 0);
      for (let j = 0; j < props.numBoids; j++) {
        const dist = pos.distanceTo(components.position[j]);
        if (i != j && dist <= 8) {
          let diff = pos.clone().sub(components.position[j]);
          diff.divideScalar(dist * dist);
          steering.add(diff);
          if (diff.x == Infinity || diff == -Infinity) console.log(diff);
          // The only way for diff to equal infinity is if it's being divided by 0. How the fuck is that even possible in my code?
          total++;
        }
      }

      if (total > 0) {
        steering.divideScalar(total);
        steering.normalize().multiplyScalar(maxVelocity);
        steering.sub(vel);
        steering.clampLength(0, maxForce);
        accl.add(steering.multiplyScalar(0.75));
      }

      // //* COHESION
      total = 0;
      steering = new Vector3(0, 0, 0);
      for (let j = 0; j < props.numBoids; j++) {
        let diff = components.position[j].clone().sub(pos);
        let dist = Math.sqrt(diff.dot(diff));
        if (i != j && dist <= 15) {
          steering.add(components.position[j]);
          total++;
        }
      }

      if (total > 0) {
        steering.divideScalar(total);
        steering.sub(pos);
        steering.normalize().multiplyScalar(maxVelocity);
        steering.sub(vel);
        steering.clampLength(0, maxForce);
        accl.add(steering.multiplyScalar(0.6));
      }

      //* TRANSLATION
      vel
        .add(accl.multiplyScalar(deltaSecs))
        .clampLength(minVelocity, maxVelocity);

      pos.add(vel.clone().multiplyScalar(deltaSecs));

      //X-Constraint
      if (pos.x < -props.boxSize[0] / 2) {
        pos.setX(props.boxSize[0] / 2);
      } else if (pos.x > props.boxSize[0] / 2) {
        pos.setX(-props.boxSize[0] / 2);
      }

      //Y-Constraint
      if (pos.y < -props.boxSize[1] / 2) {
        pos.setY(props.boxSize[1] / 2);
      } else if (pos.y > props.boxSize[1] / 2) {
        pos.setY(-props.boxSize[1] / 2);
      }

      //Z-Constraint
      if (pos.z < -props.boxSize[2] / 2) {
        pos.setZ(props.boxSize[2] / 2);
      } else if (pos.z > props.boxSize[2] / 2) {
        pos.setZ(-props.boxSize[2] / 2);
      }
    }
  }, physicsInverval);

  useFrame((state, delta) => {
    //So I need Y on the -Z axis,  Rotated TOWARDS -Z. How do I do that? What does up actually represent?
    let mesh;
    for (let i = 0; i < props.numBoids; i++) {
      mesh = components.meshRef[i].current;
      mesh.position.copy(components.position[i]);

      // TODO: Calculate mesh orientation with quaternions instead
      mesh.lookAt(
        components.position[i]
          .clone()
          .add(components.velocity[i].clone().normalize())
      );
      mesh.rotateX(Math.PI / 2);
      components.axesHelper[i].position.copy(components.position[i]);
      components.axesHelper[i].rotation.copy(mesh.rotation);
    }
  });

  return (
    <group>
      made? The previous one isn't being removed.
      <axesHelper args={[3]} />
      <BoundingBox size={props.boxSize} />
      {components.meshComponent}
    </group>
  );
};

export default Boids;
