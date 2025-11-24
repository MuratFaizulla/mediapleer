export interface Subtitle {
  src: string
  lang: string
}

export interface MediaOption {
  src: string
  resolution: string
}


// Обновить MediaElement (добавить 2 поля):
export interface MediaElement {
  title?: string
  sub: Subtitle[]
  src: MediaOption[]
  source?: MediaSource      // 🔥 Добавь
  originalUrl?: string      // 🔥 Добавь
}

export interface Playlist {
  items: MediaElement[]
  currentIndex: number
}

export interface TargetState {
  playlist: Playlist
  playing: MediaElement
  paused: boolean
  progress: number
  playbackRate: number
  loop: boolean
  lastSync: number
}

export interface PlayerState extends TargetState {
  currentSrc: MediaOption
  currentSub: Subtitle
  volume: number
  muted: boolean
  fullscreen: boolean
  error: any
  duration: number
}

export interface UserState {
  socketIds: string[]
  ip: string
  uid: string
  name: string
  avatar: string
  player: PlayerState
}

export enum Command {
  play = "play",
  pause = "pause",
  seek = "seek",
  playbackRate = "playbackRate",
  playSrc = "playSrc",
}

export interface CommandLog {
  command: Command
  userId: string
  target?: MediaElement | Playlist | string | number
  time: number
}

export interface RoomState {
  serverTime: number
  id: string
  ownerId: string
  users: UserState[]
  targetState: TargetState
  commandHistory: CommandLog[]
}
// Добавляем новый тип источника
export enum MediaSource {
  YouTube = "youtube",
  OneDrive = "onedrive",
  DirectUrl = "direct",
  Local = "local"
}

export interface MediaElement {
  title?: string
  sub: Subtitle[]
  src: MediaOption[]
  source?: MediaSource  // 🔥 НОВОЕ поле
  originalUrl?: string  // 🔥 Исходная ссылка
}

