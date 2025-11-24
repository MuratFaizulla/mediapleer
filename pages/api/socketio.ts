import * as socketIo from "socket.io"
import { Server } from "socket.io"
import { NextApiRequest, NextApiResponse } from "next"
import { ClientToServerEvents, ServerToClientEvents } from "../../lib/socket"
import {
  decUsers,
  deleteRoom,
  getRoom,
  incUsers,
  roomExists,
  setRoom,
} from "../../lib/cache"
import { createNewRoom, createNewUser, updateLastSync } from "../../lib/room"
import { MediaSource, Playlist, RoomState, UserState } from "../../lib/types"
import { isOneDriveUrl, isUrl } from "../../lib/utils"


// Функция для получения IP-адреса клиента
const getClientIp = (socket: socketIo.Socket): string => {
  // Если используется прокси (nginx, cloudflare и т.д.)
  const forwarded = socket.handshake.headers["x-forwarded-for"]
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded
    return ips.split(",")[0].trim()
  }

  // Проверяем x-real-ip (часто используется nginx)
  const realIp = socket.handshake.headers["x-real-ip"]
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp
  }

  // Fallback на прямой адрес сокета
  return socket.handshake.address || "unknown"
}

const ioHandler = (_: NextApiRequest, res: NextApiResponse) => {
  // @ts-ignore
  if (res.socket !== null && "server" in res.socket && !res.socket.server.io) {
    console.log("*Первое использование, запуск socket.io")

    const io = new Server<ClientToServerEvents, ServerToClientEvents>(
      // @ts-ignore
      res.socket.server,
      {
        path: "/api/socketio",
      }
    )

    const broadcast = async (room: string | RoomState) => {
      const roomId = typeof room === "string" ? room : room.id

      if (typeof room !== "string") {
        await setRoom(roomId, room)
      } else {
        const d = await getRoom(roomId)
        if (d === null) {
          throw Error("Impossible room state of null for room: " + roomId)
        }
        room = d
      }

      room.serverTime = new Date().getTime()
      io.to(roomId).emit("update", room)
    }

    io.on(
      "connection",
      async (
        socket: socketIo.Socket<ClientToServerEvents, ServerToClientEvents>
      ) => {
        if (
          !("roomId" in socket.handshake.query) ||
          typeof socket.handshake.query.roomId !== "string"
        ) {
          socket.disconnect()
          return
        }

        const roomId = socket.handshake.query.roomId.toLowerCase()
        const clientIp = getClientIp(socket) // Получаем IP

        const log = (...props: any[]) => {
          console.log(
            "[" + new Date().toUTCString() + "][room " + roomId + "]",
            socket.id,
            ...props
          )
        }

        if (!(await roomExists(roomId))) {
          await createNewRoom(roomId, socket.id)
          log("созданная комната")
        }

        socket.join(roomId)
        await incUsers()
        log("присоединился, IP:", clientIp)

        await createNewUser(roomId, socket.id, clientIp) // Передаём IP

        socket.on("disconnect", async () => {
          await decUsers()
          log("отключен")
          const room = await getRoom(roomId)
          if (room === null) return

          room.users = room.users.filter(
            (user) => user.socketIds[0] !== socket.id
          )
          if (room.users.length === 0) {
            await deleteRoom(roomId)
            log("удалена пустая комната")
          } else {
            if (room.ownerId === socket.id) {
              room.ownerId = room.users[0].uid
            }
            await broadcast(room)
          }
        })

        socket.on("setPaused", async (paused) => {
          let room = await getRoom(roomId)
          if (room === null) {
            throw new Error("Установка паузы для несуществующей комнаты:" + roomId)
          }
          log("установить паузу на", paused)

          room = updateLastSync(room)
          room.targetState.paused = paused
          await broadcast(room)
        })

        socket.on("setLoop", async (loop) => {
          const room = await getRoom(roomId)
          if (room === null) {
            throw new Error("Настройка цикла для несуществующей комнаты:" + roomId)
          }
          log("установить цикл на", loop)

          room.targetState.loop = loop
          await broadcast(updateLastSync(room))
        })

        socket.on("setProgress", async (progress) => {
          const room = await getRoom(roomId)
          if (room === null) {
            throw new Error("Настройка прогресса для несуществующей комнаты:" + roomId)
          }

          room.users = room.users.map((user) => {
            if (user.socketIds[0] === socket.id) {
              user.player.progress = progress
            }
            return user
          })

          await broadcast(room)
        })

        socket.on("setPlaybackRate", async (playbackRate) => {
          let room = await getRoom(roomId)
          if (room === null) {
            throw new Error(
              "Настройка playbackRate для несуществующей комнаты:" + roomId
            )
          }
          log("установить скорость воспроизведения", playbackRate)

          room = updateLastSync(room)
          room.targetState.playbackRate = playbackRate
          await broadcast(room)
        })

        socket.on("seek", async (progress) => {
          const room = await getRoom(roomId)
          if (room === null) {
            throw new Error("Настройка прогресса для несуществующей комнаты:" + roomId)
          }
          log("стремясь", progress)

          room.targetState.progress = progress
          room.targetState.lastSync = new Date().getTime() / 1000
          await broadcast(room)
        })

       // 🔥 ОБНОВЛЕННАЯ ЛОГИКА: ЦИКЛИЧЕСКИЙ ПЛЕЙЛИСТ С ОТЛАДКОЙ
        socket.on("playEnded", async () => {
          let room = await getRoom(roomId)
          if (room === null) {
            throw new Error("Игра окончена из-за несуществующей комнаты:" + roomId)
          }
          
          // 🔍 ОТЛАДОЧНЫЕ ЛОГИ
          log("🎬 воспроизведение закончилось")
          log("📊 ОТЛАДКА ПЛЕЙЛИСТА:", {
            currentIndex: room.targetState.playlist.currentIndex,
            playlistLength: room.targetState.playlist.items.length,
            loopEnabled: room.targetState.loop,
            playlistItems: room.targetState.playlist.items.map((item, index) => ({
              index,
              title: item.title || 'No title',
              src: item.src[0]?.src?.substring(0, 50) + '...' || 'No src'
            }))
          })

          // ЛОГИКА ЦИКЛИЧЕСКОГО ПЛЕЙЛИСТА:
          if (room.targetState.loop) {
            // 1. Если включен LOOP одного видео - повторяем его
            room.targetState.progress = 0
            room.targetState.paused = false
            log("🔁 LOOP: зацикливание текущего видео")
          } else if (
            room.targetState.playlist.currentIndex + 1 <
            room.targetState.playlist.items.length
          ) {
            // 2. Если есть следующее видео в плейлисте - переходим к нему
            const nextIndex = room.targetState.playlist.currentIndex + 1
            room.targetState.playing = room.targetState.playlist.items[nextIndex]
            room.targetState.playlist.currentIndex = nextIndex
            room.targetState.progress = 0
            room.targetState.paused = false
            log("▶️ СЛЕДУЮЩЕЕ ВИДЕО: воспроизведение следующего видео в плейлисте, индекс:", nextIndex)
            log("📹 Источник следующего видео:", room.targetState.playing.src[0]?.src?.substring(0, 80) + '...')
          } else if (room.targetState.playlist.items.length > 0) {
            // 3. 🔥 НОВАЯ ЛОГИКА: Дошли до конца плейлиста - начинаем сначала!
            room.targetState.playing = room.targetState.playlist.items[0]
            room.targetState.playlist.currentIndex = 0
            room.targetState.progress = 0
            room.targetState.paused = false
            log("🔄 ЦИКЛ ПЛЕЙЛИСТА: последнее видео закончилось, перезапуск с первого видео!")
            log("📹Источник первого видео:", room.targetState.playing.src[0]?.src?.substring(0, 80) + '...')
          } else {
            // 4. Если плейлист пустой - останавливаемся
            room.targetState.progress =
              room.users.find((user) => user.socketIds[0] === socket.id)?.player
                .progress || 0
            room.targetState.paused = true
            log("⏹️ ПУСТО: пустой плейлист, остановка воспроизведения")
          }

          room.targetState.lastSync = new Date().getTime() / 1000
          await broadcast(room)
          log("📡 Трансляция отправлена ​​с обновленным состоянием комнаты")
        })

        socket.on("playAgain", async () => {
          let room = await getRoom(roomId)
          if (room === null) {
            throw new Error("Сыграйте еще раз для несуществующей комнаты:" + roomId)
          }
          log("воспроизвести тот же медиафайл снова")

          room.targetState.progress = 0
          room.targetState.paused = false
          room.targetState.lastSync = new Date().getTime() / 1000
          await broadcast(room)
        })

        socket.on("playItemFromPlaylist", async (index) => {
          let room = await getRoom(roomId)
          if (room === null) {
            throw new Error("Игра окончена из-за несуществующей комнаты:" + roomId)
          }

          if (index < 0 || index >= room.targetState.playlist.items.length) {
            return log(
              "вне индекса:",
              index,
              "длина плейлиста:",
              room.targetState.playlist.items.length
            )
          }

          log("игровой предмет", index, "из плейлиста")
          room.targetState.playing = room.targetState.playlist.items[index]
          room.targetState.playlist.currentIndex = index
          room.targetState.progress = 0
          room.targetState.lastSync = new Date().getTime() / 1000
          await broadcast(room)
        })

        socket.on("updatePlaylist", async (playlist: Playlist) => {
          const room = await getRoom(roomId)
          if (room === null) {
            throw new Error("Настройка плейлиста для несуществующей комнаты:" + roomId)
          }
          log("обновление плейлиста", playlist)

          if (
            playlist.currentIndex < -1 ||
            playlist.currentIndex >= playlist.items.length
          ) {
            return log(
              "вне индекса:",
              playlist.currentIndex,
              "длина плейлиста:",
              playlist.items.length
            )
          }

          room.targetState.playlist = playlist
          await broadcast(room)
        })

        socket.on("updateUser", async (user: UserState) => {
          const room = await getRoom(roomId)
          if (room === null) {
            throw new Error("Настройка пользователя для несуществующей комнаты:" + roomId)
          }
          log("обновление пользователя", user)

          room.users = room.users.map((u) => {
            if (u.socketIds[0] !== socket.id) {
              return u
            }
            if (u.avatar !== user.avatar) {
              u.avatar = user.avatar
            }
            if (u.name !== user.name) {
              u.name = user.name
            }
            return u
          })

          await broadcast(room)
        })
        socket.on('updatePlaylist', async (newPlaylist: Playlist) => {
          const room = await getRoom(roomId)
          if (room === null) return
          room.targetState.playlist = newPlaylist
          await broadcast(room)
        })
        socket.on("playUrl", async (url) => {
          const room = await getRoom(roomId)
          if (room === null) {
            throw new Error("...")
          }
          log("URL-адрес воспроизведения", url)
        
          // 🔥 ДОБАВЬ ЭТИ 12 СТРОК:
          if (url.startsWith("blob:")) {
            room.targetState.playing = {
              src: [{ src: url, resolution: "" }],
              sub: [],
              source: MediaSource.Local,
              originalUrl: url,
            }
            room.targetState.playlist.currentIndex = -1
            room.targetState.progress = 0
            room.targetState.paused = false
            room.targetState.lastSync = new Date().getTime() / 1000
            await broadcast(room)
            return
          }
        
          // ... остальной твой код без изменений
        })



        
        socket.on("fetch", async () => {
          const room = await getRoom(roomId)
          if (room === null) {
            throw new Error(
              "Невозможная несуществующая комната, ничего отправить невозможно:" + roomId
            )
          }

          room.serverTime = new Date().getTime()
          socket.emit("update", room)
        })
      }
    )

    // @ts-ignore
    res.socket.server.io = io
  }

  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}






export default ioHandler