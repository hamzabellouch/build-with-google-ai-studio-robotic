/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

/**
 * DragStateManager
 * Handles the user interaction for cursor tracking.
 * Actual dragging of physics objects is currently disabled.
 */
export class DragStateManager {
    scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.Camera; controls: OrbitControls;
    container: HTMLElement;

    mousePos = new THREE.Vector2(); 
    raycaster = new THREE.Raycaster(); 
    
    active = false;    
    mouseDown = false; 
    
    physicsObject: THREE.Object3D | null = null; 
    grabDistance = 0.0; 
    
    localHit = new THREE.Vector3();    
    worldHit = new THREE.Vector3();    
    currentWorld = new THREE.Vector3();
    
    private _onPointerBound: (evt: PointerEvent) => void;

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera, container: HTMLElement, controls: OrbitControls) {
        this.scene = scene; this.renderer = renderer; this.camera = camera; this.controls = controls; this.container = container;
        
        // Raycaster needs a threshold for clicking thin lines
        this.raycaster.params.Line.threshold = 0.1;

        // Bind events securely
        this._onPointerBound = this.onPointer.bind(this);
        // Cast to EventListener to satisfy strict types if needed, though usually standard
        container.addEventListener('pointerdown', this._onPointerBound);
        document.addEventListener('pointermove', this._onPointerBound);
        document.addEventListener('pointerup', this._onPointerBound);
        document.addEventListener('pointercancel', this._onPointerBound);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addTransformControl(c: TransformControls) { /* No-op */ }

    // Central event handler
    onPointer(evt: PointerEvent) {
        if (evt.type === "pointerdown") {
             // Logic disabled
        } else if (evt.type === "pointermove") {
             // Logic disabled
        } else if (evt.type === "pointerup" || evt.type === "pointercancel") {
             // Logic disabled
        }
    }

    update() {
        // No-op
    }

    dispose() {
        this.container.removeEventListener('pointerdown', this._onPointerBound);
        document.removeEventListener('pointermove', this._onPointerBound);
        document.removeEventListener('pointerup', this._onPointerBound);
        document.removeEventListener('pointercancel', this._onPointerBound);
    }
}
