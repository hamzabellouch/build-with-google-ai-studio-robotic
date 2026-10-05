/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RobotModelDef {
  id: string;
  name: string;
  shortName: string;
  manufacturer: string;
  country: string;
  dof: number;
  type: 'Articulated Cobot' | 'SCARA Assembly' | 'Industrial Cobot' | 'Mobile Manipulator';
  payload: string;
  reach: string;
  repeatability: string;
  weight: string;
  description: string;
  tag: string;
  sceneFile: string;
  repoFolder: string;
  isCustomXml?: boolean;
}

export const FAMOUS_ROBOTS: RobotModelDef[] = [
  {
    id: 'franka_emika_panda',
    name: 'Franka Emika Panda',
    shortName: 'Franka Panda',
    manufacturer: 'Franka Robotics',
    country: 'Germany',
    dof: 7,
    type: 'Articulated Cobot',
    payload: '3.0 kg',
    reach: '855 mm',
    repeatability: '±0.1 mm',
    weight: '18 kg',
    description: 'Gold standard research & industrial collaborative robot with 7 joint torque sensors for compliant manipulation.',
    tag: 'Research Standard',
    sceneFile: 'scene.xml',
    repoFolder: 'franka_emika_panda'
  },
  {
    id: 'scara_robot',
    name: 'EPSON / Yamaha SCARA G6',
    shortName: 'SCARA G6',
    manufacturer: 'EPSON / Yamaha',
    country: 'Japan',
    dof: 4,
    type: 'SCARA Assembly',
    payload: '6.0 kg',
    reach: '650 mm',
    repeatability: '±0.015 mm',
    weight: '27 kg',
    description: 'High-speed Selective Compliance Assembly Robot Arm specialized for ultra-fast pick-and-place and precision kitting.',
    tag: 'High-Speed Assembly',
    sceneFile: 'scene.xml',
    repoFolder: 'scara_robot',
    isCustomXml: true
  },
  {
    id: 'universal_robots_ur5e',
    name: 'Universal Robots UR5e',
    shortName: 'UR5e',
    manufacturer: 'Universal Robots',
    country: 'Denmark',
    dof: 6,
    type: 'Articulated Cobot',
    payload: '5.0 kg',
    reach: '850 mm',
    repeatability: '±0.03 mm',
    weight: '20.6 kg',
    description: 'The world’s most popular collaborative industrial robot arm, balancing payload, reach, and precision.',
    tag: 'Global Industry Standard',
    sceneFile: 'scene.xml',
    repoFolder: 'universal_robots_ur5e'
  },
  {
    id: 'kuka_iiwa_14',
    name: 'KUKA LBR iiwa 14 R820',
    shortName: 'KUKA iiwa 14',
    manufacturer: 'KUKA Robotics',
    country: 'Germany',
    dof: 7,
    type: 'Industrial Cobot',
    payload: '14.0 kg',
    reach: '820 mm',
    repeatability: '±0.1 mm',
    weight: '29.9 kg',
    description: 'Heavy-payload sensitive lightweight robot with integrated torque sensors in every joint for industrial co-working.',
    tag: 'High Payload',
    sceneFile: 'scene.xml',
    repoFolder: 'kuka_iiwa_14'
  },
  {
    id: 'kinova_gen3',
    name: 'Kinova Gen3 Ultra-Lightweight',
    shortName: 'Kinova Gen3',
    manufacturer: 'Kinova Robotics',
    country: 'Canada',
    dof: 7,
    type: 'Articulated Cobot',
    payload: '4.0 kg',
    reach: '902 mm',
    repeatability: '±0.1 mm',
    weight: '8.2 kg',
    description: 'Ultra-lightweight carbon fiber robotic arm designed for mobile robotics, medical assistance, and field manipulation.',
    tag: 'Ultra-Lightweight',
    sceneFile: 'scene.xml',
    repoFolder: 'kinova_gen3'
  },
  {
    id: 'rethink_robotics_sawyer',
    name: 'Rethink Robotics Sawyer',
    shortName: 'Sawyer',
    manufacturer: 'Rethink Robotics',
    country: 'USA / Germany',
    dof: 7,
    type: 'Industrial Cobot',
    payload: '4.0 kg',
    reach: '1260 mm',
    repeatability: '±0.1 mm',
    weight: '19 kg',
    description: 'Long-reach compliant industrial manipulator equipped with high-resolution Series Elastic Actuators (SEA).',
    tag: 'Extended Reach',
    sceneFile: 'scene.xml',
    repoFolder: 'rethink_robotics_sawyer'
  },
  {
    id: 'ufactory_xarm7',
    name: 'UFACTORY xArm 7',
    shortName: 'xArm 7',
    manufacturer: 'UFACTORY',
    country: 'China',
    dof: 7,
    type: 'Articulated Cobot',
    payload: '3.5 kg',
    reach: '700 mm',
    repeatability: '±0.1 mm',
    weight: '11.5 kg',
    description: 'Affordable 7-DOF harmonic-drive robotic arm built for lab automation, vision sorting, and desktop manufacturing.',
    tag: 'Lab Automation',
    sceneFile: 'scene.xml',
    repoFolder: 'ufactory_xarm7'
  },
  {
    id: 'ufactory_lite6',
    name: 'UFACTORY Lite 6',
    shortName: 'Lite 6',
    manufacturer: 'UFACTORY',
    country: 'China',
    dof: 6,
    type: 'Articulated Cobot',
    payload: '1.0 kg',
    reach: '440 mm',
    repeatability: '±0.2 mm',
    weight: '7.2 kg',
    description: 'Compact 6-axis lightweight desktop robotic arm designed for rapid automated testing, light assembly, and education.',
    tag: 'Compact Desktop',
    sceneFile: 'scene.xml',
    repoFolder: 'ufactory_lite6'
  },
  {
    id: 'agilex_piper',
    name: 'AgileX Piper Mobile Arm',
    shortName: 'AgileX Piper',
    manufacturer: 'AgileX Robotics',
    country: 'China',
    dof: 6,
    type: 'Mobile Manipulator',
    payload: '1.5 kg',
    reach: '626 mm',
    repeatability: '±0.05 mm',
    weight: '4.2 kg',
    description: 'High-dexterity open-source robotic arm built for mobile chassis integration, teleoperation, and embodied AI.',
    tag: 'Embodied AI & Mobile',
    sceneFile: 'scene.xml',
    repoFolder: 'agilex_piper'
  },
  {
    id: 'franka_fr3',
    name: 'Franka Research 3 (FR3)',
    shortName: 'Franka FR3',
    manufacturer: 'Franka Robotics',
    country: 'Germany',
    dof: 7,
    type: 'Articulated Cobot',
    payload: '3.0 kg',
    reach: '855 mm',
    repeatability: '±0.05 mm',
    weight: '17.8 kg',
    description: 'Next-generation successor to Panda with 1 kHz realtime control loop, enhanced joint velocities, and advanced dynamics.',
    tag: 'Next-Gen Tactile',
    sceneFile: 'scene.xml',
    repoFolder: 'franka_fr3'
  }
];
