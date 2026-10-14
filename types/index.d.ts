export type KizMode = 'thinking' | 'requesting' | 'responding' | 'tool-input' | 'tool-use'

declare module 'claude-code' {
  interface PluginState {
    'marin-kitagawa': { isOff: boolean }
  }
}
