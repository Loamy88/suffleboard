import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createMaterial } from './utils.js';

class Disc {
    constructor(scene, world, x, z, color, playerNum) {
        this.scene = scene;
        this.world = world;
        this.playerNum = playerNum;
        this.radius = 0.2;
        this.height = 0.1;
        this.scored = false;
        this.points = 0;
        this.hasBeenShot = false;

        // Create visual representation
        const geometry = new THREE.CylinderGeometry(
            this.radius, 
            this.radius, 
            this.height, 
            32
        );
        const material = createMaterial(color, {
            metalness: 0.8,
            roughness: 0.2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.set(x, this.height / 2, z);
        this.scene.add(this.mesh);

        // Create physics body
        const shape = new CANNON.Cylinder(
            this.radius,
            this.radius,
            this.height,
            16
        );
        this.body = new CANNON.Body({
            mass: 1,
            shape: shape,
            position: new CANNON.Vec3(x, this.height / 2, z),
            linearDamping: 0.1,
            angularDamping: 0.3
        });
        this.body.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0),
            Math.PI / 2
        );
        this.world.addBody(this.body);
    }

    update() {
        if (this.body && this.mesh) {
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
        }
    }

    reset() {
        if (this.body) {
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.body.position.set(this.initialX || 0, this.height / 2, this.initialZ || 0);
            this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        }
        if (this.mesh) {
            this.mesh.position.set(this.initialX || 0, this.height / 2, this.initialZ || 0);
            this.mesh.quaternion.set(0, 0, 0, 1);
            this.mesh.rotation.x = Math.PI / 2;
        }
        this.scored = false;
        this.points = 0;
        this.hasBeenShot = false;
    }

    remove() {
        if (this.body) {
            this.world.removeBody(this.body);
            this.body = null;
        }
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
    }

    isMoving() {
        if (!this.body) return false;
        return this.body.velocity.length() > 0.1 || 
               this.body.angularVelocity.length() > 0.1;
    }
}

export default Disc;

