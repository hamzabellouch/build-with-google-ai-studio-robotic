/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { DragStateManager } from './DragStateManager';
import { GeomBuilder } from './rendering/GeomBuilder';
import { MujocoData, MujocoModel, MujocoModule } from './types';

/**
 * RenderSystem
 * RESPONSIBILITY: Managing the 3D Scene Graph with a light spatial aesthetic.
 */
export class RenderSystem {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls; 
    
    simGroup: THREE.Group;   
    bodies: Array<THREE.Group> = []; 
    
    ambientLight!: THREE.AmbientLight;
    customLights: { light: THREE.PointLight; helper: THREE.Mesh; control: TransformControls; name: string; baseIntensity: number; }[] = [];
    contactMarkers!: THREE.InstancedMesh; 
    
    erGroup: THREE.Group;
    private raycaster = new THREE.Raycaster();

    private dummy = new THREE.Object3D(); 
    private container: HTMLElement;
    private geomBuilder: GeomBuilder;
    private grid!: THREE.GridHelper;

    private isAnimatingCamera = false;
    private camAnimStartPos = new THREE.Vector3();
    private camAnimStartRot = new THREE.Quaternion();
    private camAnimStartTarget = new THREE.Vector3();
    private camAnimTargetPos = new THREE.Vector3();
    private camAnimTargetRot = new THREE.Quaternion();
    private camAnimEndTarget = new THREE.Vector3();
    private camAnimStartTime = 0;
    private camAnimDuration = 0;

    constructor(container: HTMLElement, mujoco: MujocoModule) {
        this.container = container;
        this.geomBuilder = new GeomBuilder(mujoco);
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xdbeafe); 
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true; 
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.up.set(0, 0, 1); 
        this.camera.position.set(2, -1.5, 2.5);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; 
        this.controls.dampingFactor = 0.1;
        this.controls.minDistance = 0.1; 
        this.controls.maxDistance = 100;
        this.controls.target.set(0, 0, 0);

        this.simGroup = new THREE.Group();
        this.scene.add(this.simGroup);

        this.erGroup = new THREE.Group();
        this.scene.add(this.erGroup);

        this.initContactMarkers();
        this.initGrid();
        
        window.addEventListener('resize', this.onResize);
    }

    private initGrid() {
        if (this.grid) this.scene.remove(this.grid);
        // Halved grid size to 5x5 as requested
        this.grid = new THREE.GridHelper(5, 50, 0xbfdbfe, 0xeff6ff);
        this.grid.rotation.x = Math.PI / 2;
        this.grid.position.z = -0.001;
        this.scene.add(this.grid);
    }

    setDarkMode(enabled: boolean) {
        if (enabled) {
            this.scene.background = new THREE.Color(0x020617);
            this.scene.remove(this.grid);
            this.grid = new THREE.GridHelper(5, 50, 0x1e293b, 0x0f172a);
            this.grid.rotation.x = Math.PI / 2;
            this.grid.position.z = -0.001;
            this.scene.add(this.grid);
        } else {
            this.scene.background = new THREE.Color(0xdbeafe);
            this.scene.remove(this.grid);
            this.grid = new THREE.GridHelper(5, 50, 0xbfdbfe, 0xeff6ff);
            this.grid.rotation.x = Math.PI / 2;
            this.grid.position.z = -0.001;
            this.scene.add(this.grid);
        }
    }

    initScene(mjModel: MujocoModel) {
        this.bodies.forEach(b => this.simGroup.remove(b));
        this.bodies = [];
        
        for (let i = 0; i < mjModel.nbody; i++) {
            const grp = new THREE.Group(); 
            grp.userData.bodyID = i; 
            this.bodies.push(grp); 
            this.simGroup.add(grp);
        }

        for (let g = 0; g < mjModel.ngeom; g++) {
            const mesh = this.geomBuilder.create(mjModel, g);
            if (mesh) {
                this.bodies[mjModel.geom_bodyid[g]].add(mesh);
            }
        }
    }

    initLights(dragStateManager: DragStateManager) {
        const main = new THREE.DirectionalLight(0xffffff, 1.2); 
        main.position.set(1, 2, 5); 
        main.castShadow = true; 
        main.shadow.mapSize.set(2048, 2048); 
        main.shadow.bias = -0.0001; 
        this.simGroup.add(main);
        
        const fill = new THREE.DirectionalLight(0xffffff, 0.8); 
        fill.position.set(-1, -1, 3); 
        this.simGroup.add(fill);
        
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7); 
        this.simGroup.add(this.ambientLight);
    }

    update(mjData: MujocoData, showContacts: boolean) {
        if (this.isAnimatingCamera) {
            const now = performance.now();
            const progress = Math.min((now - this.camAnimStartTime) / this.camAnimDuration, 1.0);
            const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            this.camera.position.lerpVectors(this.camAnimStartPos, this.camAnimTargetPos, ease);
            this.camera.quaternion.slerpQuaternions(this.camAnimStartRot, this.camAnimTargetRot, ease);
            this.controls.target.lerpVectors(this.camAnimStartTarget, this.camAnimEndTarget, ease);
            if (progress >= 1.0) {
                this.isAnimatingCamera = false;
                this.camera.position.copy(this.camAnimTargetPos);
                this.camera.quaternion.copy(this.camAnimTargetRot);
                this.controls.target.copy(this.camAnimEndTarget);
                this.controls.update();
            }
        } else {
            this.controls.update(); 
        }
        
        for (let i = 0; i < this.bodies.length; i++) {
            if (this.bodies[i]) {
                this.bodies[i].position.set(mjData.xpos[i * 3], mjData.xpos[i * 3 + 1], mjData.xpos[i * 3 + 2]);
                this.bodies[i].quaternion.set(mjData.xquat[i * 4 + 1], mjData.xquat[i * 4 + 2], mjData.xquat[i * 4 + 3], mjData.xquat[i * 4]);
                this.bodies[i].updateMatrixWorld();
            }
        }
        this.updateContacts(mjData, showContacts);
        
        const time = performance.now() / 1000;
        this.erGroup.children.forEach((child, i) => {
            child.position.z = child.userData.baseZ + Math.sin(time * 3 + i) * 0.05;
        });

        this.renderer.render(this.scene, this.camera); 
    }

    private initContactMarkers() {
        this.contactMarkers = new THREE.InstancedMesh(
            new THREE.SphereGeometry(0.02, 8, 8), 
            new THREE.MeshStandardMaterial({ color: 0x4f46e5, emissive: 0x312e81, roughness: 0.5 }), 
            500 
        );
        this.contactMarkers.count = 0; 
        this.contactMarkers.visible = false; 
        this.simGroup.add(this.contactMarkers);
    }

    private updateContacts(mjData: MujocoData, show: boolean) {
        if (!show || !mjData.ncon) { this.contactMarkers.count = 0; return; }
        const count = Math.min(mjData.ncon, this.contactMarkers.instanceMatrix.count);
        this.contactMarkers.count = count; 
        this.contactMarkers.visible = count > 0;
        for (let i = 0; i < count; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const con = (mjData.contact as any)[i] || (mjData.contact as any).get(i);
            if (con?.pos) { 
                this.dummy.position.set(con.pos[0], con.pos[1], con.pos[2]); 
                this.dummy.updateMatrix(); 
                this.contactMarkers.setMatrixAt(i, this.dummy.matrix); 
            }
        }
        this.contactMarkers.instanceMatrix.needsUpdate = true; 
    }

    moveCameraTo(position: THREE.Vector3, target: THREE.Vector3, durationMs: number): Promise<void> {
        return new Promise((resolve) => {
            this.isAnimatingCamera = true;
            this.camAnimStartTime = performance.now();
            this.camAnimDuration = durationMs;
            this.camAnimStartPos.copy(this.camera.position);
            this.camAnimStartRot.copy(this.camera.quaternion);
            this.camAnimStartTarget.copy(this.controls.target);
            this.camAnimTargetPos.copy(position);
            this.camAnimEndTarget.copy(target);
            const dummyCam = this.camera.clone();
            dummyCam.position.copy(position);
            dummyCam.lookAt(target);
            this.camAnimTargetRot.copy(dummyCam.quaternion);
            setTimeout(resolve, durationMs);
        });
    }

    getCameraState() {
        return { position: this.camera.position.clone(), target: this.controls.target.clone() };
    }

    /**
     * Captures a snapshot of the current renderer state.
     * @param width Desired width of snapshot
     * @param height Desired height of snapshot
     * @param mimeType Image format (e.g. 'image/png' or 'image/jpeg')
     */
    getCanvasSnapshot(width?: number, height?: number, mimeType = 'image/jpeg'): string {
        if (width && height) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(this.renderer.domElement, 0, 0, width, height);
                return tempCanvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.8 : undefined);
            }
        }
        return this.renderer.domElement.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.8 : undefined);
    }

    project2DTo3D(x: number, y: number, cameraPos: THREE.Vector3, lookAt: THREE.Vector3): { point: THREE.Vector3, bodyId: number } | null {
        const virtCam = this.camera.clone();
        virtCam.position.copy(cameraPos);
        virtCam.lookAt(lookAt);
        virtCam.updateMatrixWorld();
        virtCam.updateProjectionMatrix(); 
        const ndc = new THREE.Vector2((x / 1000) * 2 - 1, -(y / 1000) * 2 + 1);
        this.raycaster.setFromCamera(ndc, virtCam);
        const objects: THREE.Object3D[] = [];
        this.simGroup.traverse((c) => { if ((c as THREE.Mesh).isMesh) objects.push(c); });
        const hits = this.raycaster.intersectObjects(objects);
        if (hits.length > 0) {
            let obj = hits[0].object;
            while (obj && obj.userData.bodyID === undefined && obj.parent) {
                obj = obj.parent;
            }
            const bodyId = obj && obj.userData.bodyID !== undefined ? obj.userData.bodyID : -1;
            return { point: hits[0].point, bodyId };
        }
        return null;
    }

    clearErMarkers() { this.erGroup.clear(); }

    addErMarker(position: THREE.Vector3, label: string, id: number) {
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.015, 0.05, 16),
            new THREE.MeshStandardMaterial({ color: 0x4f46e5, emissive: 0x312e81 })
        );
        cone.geometry.rotateX(-Math.PI / 2);
        const group = new THREE.Group();
        group.position.set(position.x, position.y, 0.01);
        group.position.z += 0.1; 
        group.userData.baseZ = group.position.z;
        group.userData.erId = id;
        group.add(cone);
        this.erGroup.add(group);
    }
    
    removeMarkerById(id: number) {
        for (let i = this.erGroup.children.length - 1; i >= 0; i--) {
            const child = this.erGroup.children[i];
            if (child.userData.erId === id) this.erGroup.remove(child);
        }
    }

    checkMarkerClick(x: number, y: number): THREE.Vector3 | null {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(ndc, this.camera);
        const hits = this.raycaster.intersectObjects(this.erGroup.children, true);
        if (hits.length > 0) {
            let obj = hits[0].object;
            while(obj.parent && obj.parent !== this.erGroup) obj = obj.parent;
            return new THREE.Vector3(obj.position.x, obj.position.y, obj.userData.baseZ - 0.1);
        }
        return null;
    }

    onResize = () => {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }; 

    dispose() {
        window.removeEventListener('resize', this.onResize);
        this.renderer.dispose(); 
        this.controls.dispose();
    }
}