export type KizMode = 'thinking' | 'requesting' | 'responding' | 'tool-input' | 'tool-use'

declare module 'claude-code' {
  interface PluginState {
    'noyan-kiz': { isOff: boolean }
  }
}
