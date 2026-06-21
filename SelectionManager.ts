/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';

/**
 * SelectionManager
 * A simple utility to handle double-clicking objects to highlight them.
 * It doesn't affect physics, just purely visual feedback to show which object is focused.
 */
export class SelectionManager {
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    raycaster: THREE.Raycaster;
    mousePos: THREE.Vector2;
    container: HTMLElement;
    
    previouslySelected: THREE.Mesh | null = null; // Track last selected to un-highlight it
    highlightColor = 0x444444; // Dark grey emissive glow

    private _onDblClickBound: (evt: MouseEvent) => void;

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera, container: HTMLElement) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.container = container;
        this.raycaster = new THREE.Raycaster();
        this.mousePos = new THREE.Vector2();

        this._onDblClickBound = this.onDblClick.bind(this);
        this.container.addEventListener('dblclick', this._onDblClickBound, false);
    }

    private onDblClick(evt: MouseEvent) {
        // Standard Three.js raycasting setup: 
        // Convert mouse screen X/Y to normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mousePos.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.mousePos.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mousePos, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        let selected: THREE.Mesh | null = null;

        // Iterate through hits to find the first selectable object (one with a bodyID)
        for (let i = 0; i < intersects.length; i++) {
            let obj: THREE.Object3D | null = intersects[i].object;
            // Sometimes we hit a child part, walk up to find the main body
            while (obj && obj.userData.bodyID === undefined && obj.parent) {
                obj = obj.parent;
            }
            // bodyID > 0 avoids selecting the static floor (usually bodyID 0)
            if (obj && obj.userData.bodyID !== undefined && obj.userData.bodyID > 0) {
                selected = intersects[i].object as THREE.Mesh;
                break;
            }
        }

        this.handleSelection(selected);
    }

    private handleSelection(selected: THREE.Mesh | null) {
        // 1. Turn off glow of previously selected object
        if (this.previouslySelected && this.previouslySelected !== selected) {
            this.setEmissive(this.previouslySelected, 0x000000); // Black = no emission
        }

        // 2. Handle new selection
        if (selected) {
            if (this.previouslySelected === selected) {
                // Deselect if double-clicking the same object again
                this.setEmissive(selected, 0x000000);
                this.previouslySelected = null;
            } else {
                // Select new object and make it glow
                this.setEmissive(selected, this.highlightColor);
                this.previouslySelected = selected;
            }
        } else {
            // Clicked on empty space, deselect everything
            this.previouslySelected = null;
        }
    }

    // Helper to safely set the emissive color of a standard material
    private setEmissive(mesh: THREE.Mesh, colorHex: number) {
        if (!mesh.material) return;
        // Handle cases where a mesh might have an array of materials
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        
        // Check if it's a material that supports emissive color (MeshStandardMaterial does)
        if ((mat as THREE.MeshStandardMaterial).emissive) {
            (mat as THREE.MeshStandardMaterial).emissive.setHex(colorHex);
        }
    }

    dispose() {
        this.container.removeEventListener('dblclick', this._onDblClickBound, false);
    }
}
