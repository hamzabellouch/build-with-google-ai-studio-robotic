# Franka Panda | Pick and Place with Gemini - Codebase Documentation

This project demonstrates an Embodied Reasoning loop where a Google Gemini Vision
model analyzes a 3D robotic scene to guide a Franka Emika Panda robot in picking
up objects. The application combines React for the UI, Three.js for rendering,
and MuJoCo (via WASM) for physics simulation.

## System Architecture

1.  **Frontend (React)**: Handles the user interface, captures simulation state (images), communicates with the Gemini API, and visualizes logs.
2.  **Visualization (Three.js)**: Renders the robot, objects, and environment. It synchronizes with the physics engine frame-by-frame.
3.  **Physics (MuJoCo WASM)**: Runs the robotic simulation, collision detection, and inverse kinematics (IK) target tracking.
4.  **AI (Gemini API)**: Receives a 2D snapshot of the scene and a text prompt, returning 2D bounding boxes or keypoints which are projected back into 3D space for the robot.

---

## File Structure & Responsibilities

### Core Application

- **`index.tsx`**: Application entry point. Mounts the React root.
- **`App.tsx`**: The main controller component.
    -   Initializes the `MujocoSim`.
    -   Manages application state (loading, dark mode, logs).
    -   Handles the "Sense-Plan-Act" loop:
        1.  Captures canvas snapshot.
        2.  Sends request to Gemini (`handleErSend`).
        3.  Parses JSON response.
        4.  Projects 2D detections to 3D coordinates.
        5.  Commands the robot to pickup (`handlePickup`).
- **`types.ts`**: Shared TypeScript definitions (e.g., `LogEntry`, `DetectType`).

### Simulation Engine

- **`MujocoSim.ts`**: The central orchestrator.
    -   Loads the robot model XML (`init`).
    -   Runs the main simulation loop (`startLoop`).
    -   Syncs physics state (`mjData`) to graphics (`RenderSystem`).
    -   Manages the sequence of actions for picking up items (`pickupItems`).
- **`RenderSystem.ts`**: Manages the Three.js scene graph.
    -   Creates meshes from MuJoCo geoms (`GeomBuilder`).
    -   Handles lighting, shadows, and camera controls.
    -   Provides `project2DTo3D` to convert AI vision results into world coordinates.
- **`RobotLoader.ts`**: Fetches MJCF (XML) files and assets from remote repositories (DeepMind Menagerie) and writes them to the in-memory WASM filesystem.

### Robotics & Control

- **`IkSystem.ts`**: Manages Inverse Kinematics targets.
    -   Uses `FrankaAnalyticalIK` to solve joint angles for a desired end-effector pose.
    -   Handles redundancy resolution for the 7-DOF arm.
- **`FrankaAnalyticalIK.ts`**: An analytical geometry-based IK solver specifically for the Franka Emika Panda.
- **`SequenceAnimator.ts`**: A state machine that drives the robot through pick-and-place phases (Hover -> Open -> Lower -> Grasp -> Lift -> Move -> Drop).
    -   Interpolates joint angles for smooth motion.

### Interaction & Utils

- **`DragStateManager.ts`**: Handles mouse interaction raycasting (configured here for read-only cursor tracking as manipulation is disabled).
- **`SelectionManager.ts`**: Handles double-click object highlighting.
- **`utils/StringUtils.ts`**: Decodes C++ null-terminated strings from MuJoCo's WASM memory.
- **`rendering/GeomBuilder.ts`**: Factory that converts MuJoCo collision shapes (Box, Sphere, Mesh, etc.) into Three.js Geometry.
- **`Reflector.ts`**: A custom Three.js mesh for the reflective floor plane.
- **`CapsuleGeometry.ts`**: Custom geometry for MuJoCo's capsule primitives.
- **`MatMath.ts`**: Lightweight linear algebra helpers.

### UI Components

- **`components/UnifiedSidebar.tsx`**: The main control panel. Contains the Prompt input, Detection Type selector, and Interaction History list.
- **`components/Toolbar.tsx`**: Bottom-left floating controls for Play/Pause, Reset, Dark Mode, and Sidebar toggle.
- **`components/RobotSelector.tsx`**: Top-left overlay displaying robot status and coordinates.

---

## How It Works: The AI Loop

1.  **User Prompt**: User types "red cubes" and selects "Segmentation masks" in the Sidebar.
2.  **Capture**: `App.tsx` calls `sim.renderSys.getCanvasSnapshot()` to get a base64 JPEG of the current 3D view.
3.  **Inference**: A request is sent to `gemini-robotics-er-1.6-preview` with the image and prompt.
4.  **Response**: Gemini returns a JSON list of detected objects with 2D bounding boxes/masks.
5.  **Projection**:
    -   The app calculates the center `(x, y)` of the box in the 2D image.
    -   `RenderSystem.ts` casts a ray from the camera through that pixel into the 3D scene (`project2DTo3D`).
    -   The intersection point on the table/object becomes the 3D target.
6.  **Action**:
    -   `App.tsx` passes these 3D points to `MujocoSim`.
    -   `MujocoSim` initiates `SequenceAnimator`.
    -   `SequenceAnimator` calculates the path and drives the robot joints using `IkSystem` to pick up the object and place it in the tray.
