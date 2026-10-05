declare module 'mujoco_wasm' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadMujoco: (config?: any) => Promise<any>;
  export default loadMujoco;
}
