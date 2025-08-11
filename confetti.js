/*!
confetti
Copyright (c) 2023 by Wakana Y.K. (https://codepen.io/wakana-k/pen/gOqqWdY)
Luxurious version : https://codepen.io/wakana-k/pen/mdvoQaV
*/
"use strict";

import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js';

const worldRadius = 5;
const confettiSize = 0.07;
const confettiNum = 3000;
const rotateRange_x = Math.PI / 30;
const rotateRange_y = Math.PI / 50;
const speed_y = 0.01;
const speed_x = 0.003;
const speed_z = 0.005;

let camera, scene, renderer, controls;
let confettiMesh;
const dummy = new THREE.Object3D();
const matrix = new THREE.Matrix4();
const color = new THREE.Color();

function initConfetti() {
    // Create a container for the confetti
    const container = document.createElement('div');
    container.id = 'confetti-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '1000';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    // Set up Three.js
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, worldRadius * 3);
    camera.position.z = worldRadius * Math.sqrt(2);

    scene = new THREE.Scene();

    // Create confetti
    function getRandomColor() {
        let saturation = 100;
        let lightness = 50;
        const colors = [
            `hsl(0, ${saturation}%, ${lightness}%)`,
            `hsl(30, ${saturation}%, ${lightness}%)`,
            `hsl(60, ${saturation}%, ${lightness}%)`,
            `hsl(90, ${saturation}%, ${lightness}%)`,
            `hsl(120, ${saturation}%, ${lightness}%)`,
            `hsl(150, ${saturation}%, ${lightness}%)`,
            `hsl(180, ${saturation}%, ${lightness}%)`,
            `hsl(210, ${saturation}%, ${lightness}%)`,
            `hsl(240, ${saturation}%, ${lightness}%)`,
            `hsl(270, ${saturation}%, ${lightness}%)`,
            `hsl(300, ${saturation}%, ${lightness}%)`,
            `hsl(330, ${saturation}%, ${lightness}%)`
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    const confettiGeometry = new THREE.PlaneGeometry(confettiSize / 2, confettiSize);
    const confettiMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    
    confettiMesh = new THREE.InstancedMesh(confettiGeometry, confettiMaterial, confettiNum);

    // Set random position and rotation for each confetti piece
    for (let i = 0; i < confettiNum; i++) {
        matrix.makeRotationFromEuler(
            new THREE.Euler(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            )
        );
        matrix.setPosition(
            THREE.MathUtils.randFloat(-worldRadius, worldRadius),
            THREE.MathUtils.randFloat(-worldRadius, worldRadius),
            THREE.MathUtils.randFloat(-worldRadius, worldRadius)
        );
        confettiMesh.setMatrixAt(i, matrix);
        confettiMesh.setColorAt(i, color.set(getRandomColor()));
    }
    scene.add(confettiMesh);

    // Set up renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // Set up controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.y = 0.5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1;
    controls.maxDistance = worldRadius * Math.sqrt(2);
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2;
    controls.update();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (confettiMesh) {
        for (let i = 0; i < confettiNum; i++) {
            confettiMesh.getMatrixAt(i, matrix);
            matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            
            // Update position
            dummy.position.y -= speed_y * ((i % 4) + 1);

            // Reset position if below threshold
            if (dummy.position.y < -worldRadius) {
                dummy.position.y = worldRadius;
                dummy.position.x = THREE.MathUtils.randFloat(-worldRadius, worldRadius);
                dummy.position.z = THREE.MathUtils.randFloat(-worldRadius, worldRadius);
            } else {
                // Random movement
                if (i % 4 === 1) {
                    dummy.position.x += speed_x;
                    dummy.position.z += speed_z;
                } else if (i % 4 === 2) {
                    dummy.position.x += speed_x;
                    dummy.position.z -= speed_z;
                } else if (i % 4 === 3) {
                    dummy.position.x -= speed_x;
                    dummy.position.z += speed_z;
                } else {
                    dummy.position.x -= speed_x;
                    dummy.position.z -= speed_z;
                }
            }
            
            // Update rotation
            dummy.rotation.x += THREE.MathUtils.randFloat(0, rotateRange_x);
            dummy.rotation.z += THREE.MathUtils.randFloat(0, rotateRange_y);

            dummy.updateMatrix();
            confettiMesh.setMatrixAt(i, dummy.matrix);
        }
        confettiMesh.instanceMatrix.needsUpdate = true;
    }
    
    renderer.render(scene, camera);
}

// Clean up function to remove confetti
export function cleanupConfetti() {
    const container = document.getElementById('confetti-container');
    if (container) {
        container.remove();
    }
}

export { initConfetti };
