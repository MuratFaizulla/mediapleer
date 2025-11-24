"use client"
import { FC, useEffect, useState } from "react"
import Player from "./player/Player"
import {
  ClientToServerEvents,
  createClientSocket,
  ServerToClientEvents,
} from "../lib/socket"
import Button from "./action/Button"
import { Socket } from "socket.io-client"
import ConnectingAlert from "./alert/ConnectingAlert"
import PlaylistMenu from "./playlist/PlaylistMenu"
import IconLoop from "./icon/IconLoop"
import InputUrl from "./input/InputUrl"
import UserList from "./user/UserList"
import { PlaylistManager } from "./PlaylistManager"
import { Playlist } from "../lib/types"
interface Props {
  id: string
}

let connecting = false

const Room: FC<Props> = ({ id }) => {
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null)
  const [url, setUrl] = useState("")
  const [playlist, setPlaylist] = useState<Playlist>({
    items: [],
    currentIndex: -1
  })
  useEffect(() => {
    fetch("/api/socketio").finally(() => {
      if (socket !== null) {
        setConnected(socket.connected)
      } else {
        const newSocket = createClientSocket(id)
        newSocket.on("connect", () => {
          setConnected(true)
        })
        setSocket(newSocket)
      }
    })

    return () => {
      if (socket !== null) {
        socket.disconnect()
      }
    }
  }, [id, socket])

  const connectionCheck = () => {
    if (socket !== null && socket.connected) {
      connecting = false
      setConnected(true)
      return
    }
    setTimeout(connectionCheck, 100)
  }

  if (!connected || socket === null) {
    if (!connecting) {
      connecting = true
      connectionCheck()
    }
    return (
      <div className={"flex justify-center"}>
        <ConnectingAlert />
      </div>
    )
  }

  return (
    <div className={"flex flex-col sm:flex-row gap-1"}>
      <div className={"grow"}>
        <Player roomId={id} socket={socket} />
        {socket && (
  <PlaylistManager
    socket={socket}
    currentPlaylist={playlist}
    onPlaylistUpdate={setPlaylist}
  />
)}
        <div className={"flex flex-row gap-1 p-1"}>
          <Button
            tooltip={"Do a forced manual sync"}
            className={"p-2 flex flex-row gap-1 items-center"}
            onClick={() => {
              console.log("Fetching update", socket?.id)
              socket?.emit("fetch")
            }}
          >
            <IconLoop className={"hover:animate-spin"} />
            <div className={"hidden-below-sm"}>Ручная синхронизация</div>
          </Button>
          <InputUrl
            className={"grow"}
            url={url}
            placeholder={"Воспроизвести URL сейчас"}
            tooltip={"Play given url now"}
            onChange={setUrl}
            onSubmit={() => {
              console.log("Requesting", url, "now")
              socket?.emit("playUrl", url)
              setUrl("")
            }}
          >
            Играть
          </InputUrl>
        </div>

        <UserList socket={socket} />
      </div>

      <PlaylistMenu socket={socket} />
    </div>
  )
}

export default Room
