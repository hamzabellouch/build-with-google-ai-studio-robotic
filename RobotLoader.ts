/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MujocoModule } from "./types";

/**
 * RobotLoader
 * Handles fetching robot XML files and their dependencies (meshes, textures) from remote URLs,
 * as well as providing procedural models (such as SCARA).
 * It writes these files into MuJoCo's in-memory virtual filesystem so the C++ engine can read them.
 */
export class RobotLoader {
    private mujoco: MujocoModule;

    constructor(mujocoInstance: MujocoModule) {
        this.mujoco = mujocoInstance;
    }

    /**
     * Main entry point. Downloads the main scene XML and recursively finds/downloads all included files.
     * @param onProgress Optional callback to report loading progress string.
     */
    async load(robotId: string, sceneFile: string, onProgress?: (msg: string) => void): Promise<{ isDouble: boolean, isStacking: boolean }> {
        // 1. Clean up the virtual filesystem from previous runs
        try { this.mujoco.FS.unmount('/working'); } catch (e) { /* ignore */ }
        try { this.mujoco.FS.mkdir('/working'); } catch (e) { /* ignore */ }

        const isDouble = false;
        const isStacking = true; // All 10 robots operate with the 20-cube workspace

        // Handle procedural SCARA model directly without external downloads
        if (robotId === 'scara_robot') {
            if (onProgress) onProgress('Compiling SCARA G6 procedural model...');
            const scaraXml = this.generateScaraSceneXml();
            this.mujoco.FS.writeFile(`/working/${sceneFile}`, scaraXml);
            return { isDouble, isStacking };
        }

        // Base URL for standard models from DeepMind's repository
        const currentRobotId = robotId === 'franka_panda_stack' ? 'franka_emika_panda' : robotId;
        const baseUrl = `https://raw.githubusercontent.com/google-deepmind/mujoco_menagerie/main/${currentRobotId}/`;

        const downloaded = new Set<string>();
        const queue: Array<string> = [];
        const parser = new DOMParser();

        queue.push(sceneFile);

        // Process queue until all dependencies are downloaded
        while (queue.length > 0) {
            const fname = queue.shift()!;
            if (downloaded.has(fname)) continue;
            downloaded.add(fname);

            if (onProgress) {
                onProgress(`Loading ${fname.split('/').pop()}...`);
            }

            // Fetch file from network
            const res = await fetch(baseUrl + fname);
            if (!res.ok) {
                console.warn(`Failed to fetch ${fname}: ${res.status} ${res.statusText}`);
                continue;
            }

            // Ensure virtual directory structure exists (e.g., /working/assets/meshes/)
            const dirParts = fname.split('/');
            dirParts.pop();
            let currentPath = '/working';
            for (const part of dirParts) {
                currentPath += '/' + part;
                try { this.mujoco.FS.mkdir(currentPath); } catch (e) { /* ignore */ }
            }

            // If it's an XML, patch it and scan it for dependencies
            if (fname.endsWith('.xml')) {
                let text = await res.text();
                text = this.patchSingleRobot(fname, sceneFile, isStacking, text);
                this.mujoco.FS.writeFile(`/working/${fname}`, text);
                this.scanDependencies(text, fname, parser, downloaded, queue);
            } else {
                // Binary files (STL, PNG)
                const buffer = new Uint8Array(await res.arrayBuffer());
                this.mujoco.FS.writeFile(`/working/${fname}`, buffer);
            }
        }
        return { isDouble, isStacking };
    }

    private generateCubesInjection(): string {
        const colors = [
            '0.8 0.1 0.1 1', // Red
            '0.0 0.8 0.8 1', // Cyan
            '0.1 0.8 0.1 1', // Green
            '0.8 0.8 0.1 1'  // Yellow
        ];
        
        let injection = '';
        const positions: {x: number, y: number}[] = [];
        
        for (let i = 0; i < 20; i++) {
            let x = 0;
            let y = 0;
            let valid = false;
            let attempts = 0;
            
            while (!valid && attempts < 200) {
                const minR = 0.35;
                const maxR = 0.75;
                const r = Math.sqrt(Math.random() * (maxR*maxR - minR*minR) + minR*minR);
                const theta = Math.random() * 2 * Math.PI;
                
                x = r * Math.cos(theta);
                y = r * Math.sin(theta);
                
                valid = true;
                const distStack = Math.sqrt((x - 0.6)**2 + (y - 0)**2);
                if (distStack < 0.32) valid = false;

                if (valid) {
                    for (const p of positions) {
                        const d2 = (p.x - x)**2 + (p.y - y)**2;
                        if (d2 < 0.004) {
                            valid = false; 
                            break; 
                        }
                    }
                }
                attempts++;
            }

            if (valid) {
                positions.push({x, y});
                const color = colors[i % 4];
                injection += `<body name="cube${i}" pos="${x.toFixed(3)} ${y.toFixed(3)} 0.02"><freejoint/><geom type="box" size="0.02 0.02 0.02" rgba="${color}" mass="0.05" friction="1.5 0.3 0.1" solref="0.01 1" solimp="0.95 0.99 0.001 0.5 2" condim="4"/></body>`;
            }
        }
        injection += `<body name="stack_base" pos="0.6 0 0.0"><geom type="box" size="0.1 0.1 0.005" rgba="0.3 0.3 0.3 1"/></body>`;
        return injection;
    }

    private generateScaraSceneXml(): string {
        const cubesInjection = this.generateCubesInjection();
        return `
<mujoco model="scara_g6_workcell">
  <compiler angle="radian" autolimits="true"/>
  <option integrator="implicitfast" timestep="0.002"/>

  <default>
    <default class="scara">
      <joint damping="1.5" armature="0.1"/>
      <geom type="cylinder" rgba="0.94 0.95 0.97 1"/>
    </default>
  </default>

  <worldbody>
    <light pos="0 0 2" dir="0 0 -1" directional="true"/>
    <geom name="floor" size="2 2 0.05" type="plane" rgba="0.92 0.94 0.96 1"/>
    
    <!-- Base pedestal -->
    <body name="scara_base" pos="0 0 0">
      <geom name="base_col" type="cylinder" size="0.11 0.15" pos="0 0 0.15" rgba="0.18 0.20 0.24 1"/>
      <geom name="base_rim" type="cylinder" size="0.13 0.02" pos="0 0 0.30" rgba="0.25 0.50 0.95 1"/>

      <!-- Link 1: Shoulder Yaw (Revolute around Z) -->
      <body name="link1" pos="0 0 0.32">
        <joint name="joint1" type="hinge" axis="0 0 1" range="-2.6 2.6" class="scara"/>
        <geom name="link1_hub" type="cylinder" size="0.09 0.05" pos="0 0 0.05" rgba="0.95 0.95 0.97 1"/>
        <geom name="link1_arm" type="box" size="0.14 0.065 0.045" pos="0.14 0 0.05" rgba="0.95 0.95 0.97 1"/>
        <geom name="link1_cap" type="cylinder" size="0.075 0.05" pos="0.28 0 0.05" rgba="0.25 0.50 0.95 1"/>

        <!-- Link 2: Elbow Yaw (Revolute around Z) -->
        <body name="link2" pos="0.28 0 0.10">
          <joint name="joint2" type="hinge" axis="0 0 1" range="-2.6 2.6" class="scara"/>
          <geom name="link2_hub" type="cylinder" size="0.07 0.04" pos="0 0 0.04" rgba="0.95 0.95 0.97 1"/>
          <geom name="link2_arm" type="box" size="0.12 0.055 0.035" pos="0.12 0 0.04" rgba="0.95 0.95 0.97 1"/>
          <geom name="link2_head" type="cylinder" size="0.06 0.04" pos="0.24 0 0.04" rgba="0.18 0.20 0.24 1"/>

          <!-- Link 3: Quill Z-Axis Translation (Prismatic along Z) -->
          <body name="link3" pos="0.24 0 0.04">
            <joint name="joint3" type="slide" axis="0 0 1" range="-0.22 0.05" class="scara" damping="3.0"/>
            <geom name="quill_shaft" type="cylinder" size="0.014 0.18" pos="0 0 -0.04" rgba="0.75 0.77 0.80 1"/>
            
            <!-- Link 4: Wrist Roll & Gripper -->
            <body name="hand" pos="0 0 -0.22">
              <joint name="joint4" type="hinge" axis="0 0 1" range="-3.14 3.14" class="scara"/>
              <geom name="wrist_hub" type="cylinder" size="0.032 0.015" pos="0 0 0" rgba="0.25 0.50 0.95 1"/>
              <geom name="gripper_base" type="box" size="0.035 0.02 0.012" pos="0 0 -0.012" rgba="0.18 0.20 0.24 1"/>

              <!-- TCP Site for IK & Tracking -->
              <site name="tcp" pos="0 0 -0.05" size="0.01" rgba="1 0 0 0.5" group="1"/>

              <!-- Gripper Fingers -->
              <body name="left_finger" pos="0 0.02 -0.025">
                <joint name="finger1_jnt" type="slide" axis="0 1 0" range="-0.02 0.02" damping="0.5"/>
                <geom name="f1" type="box" size="0.006 0.005 0.02" pos="0 -0.004 -0.01" rgba="0.75 0.77 0.80 1"/>
              </body>
              <body name="right_finger" pos="0 -0.02 -0.025">
                <joint name="finger2_jnt" type="slide" axis="0 1 0" range="-0.02 0.02" damping="0.5"/>
                <geom name="f2" type="box" size="0.006 0.005 0.02" pos="0 0.004 -0.01" rgba="0.75 0.77 0.80 1"/>
              </body>
            </body>
          </body>
        </body>
      </body>
    </body>

    ${cubesInjection}
  </worldbody>

  <actuator>
    <position name="joint1_pos" joint="joint1" kp="450" kv="45"/>
    <position name="joint2_pos" joint="joint2" kp="350" kv="35"/>
    <position name="joint3_pos" joint="joint3" kp="600" kv="60"/>
    <position name="joint4_pos" joint="joint4" kp="150" kv="15"/>
    <position name="gripper" joint="finger1_jnt" kp="200" kv="20"/>
  </actuator>
</mujoco>
`;
    }

    // Modifies the standard XMLs to add cubes and ensure TCP site
    private patchSingleRobot(fname: string, sceneFile: string, isStacking: boolean, text: string): string {
        if (fname === sceneFile) {
            const injection = this.generateCubesInjection();
            text = text.replace('</worldbody>', injection + '</worldbody>');
        }
        
        // Ensure robot has a named TCP site for IK & trajectory tracking
        if (text.includes('name="hand"') && !text.includes('name="tcp"')) {
            text = text.replace(/(<body[^>]*name=["']hand["'][^>]*>)/, '$1<site name="tcp" pos="0 0 0.1" size="0.01" rgba="1 0 0 0.5" group="1"/>');
        } else if (text.includes('name="attachment_site"') && !text.includes('name="tcp"')) {
            text = text.replace('name="attachment_site"', 'name="tcp"');
        } else if (text.includes('name="pinch_site"') && !text.includes('name="tcp"')) {
            text = text.replace('name="pinch_site"', 'name="tcp"');
        }

        // Ensure gripper actuator name is normalized for Panda
        if (fname.endsWith('panda.xml') || fname.endsWith('fr3.xml')) {
            text = text.replace(/name=["']actuator8["']/, 'name="gripper"');
        }

        return text;
    }

    // Finds all files referenced in the XML so we can download them too
    private scanDependencies(xmlString: string, currentFile: string, parser: DOMParser, downloaded: Set<string>, queue: string[]) {
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const compiler = xmlDoc.querySelector('compiler');
        const meshDir = compiler?.getAttribute('meshdir') || '';
        const textureDir = compiler?.getAttribute('texturedir') || '';
        const currentDir = currentFile.includes('/') ? currentFile.substring(0, currentFile.lastIndexOf('/') + 1) : '';

        xmlDoc.querySelectorAll('[file]').forEach(el => {
            const fileAttr = el.getAttribute('file');
            if (!fileAttr) return;
            
            let prefix = '';
            if (el.tagName.toLowerCase() === 'mesh') {
                prefix = meshDir ? meshDir + '/' : '';
            } else if (['texture', 'hfield'].includes(el.tagName.toLowerCase())) {
                prefix = textureDir ? textureDir + '/' : '';
            }
            
            let fullPath = (currentDir + prefix + fileAttr).replace(/\/\//g, '/');
            const parts = fullPath.split('/');
            const norm: string[] = [];
            for (const p of parts) { if (p === '..') norm.pop(); else if (p !== '.') norm.push(p); }
            fullPath = norm.join('/');
            
            if (!downloaded.has(fullPath)) queue.push(fullPath);
        });
    }
}
