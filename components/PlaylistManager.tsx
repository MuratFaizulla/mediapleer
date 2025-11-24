// components/PlaylistManager.tsx
import React, { useState } from "react"
import { Socket } from "socket.io-client"
import { FolderUpload } from "./FolderUpload"
import { MediaElement, Playlist } from "../lib/types"
import { ClientToServerEvents, ServerToClientEvents } from "../lib/socket"

interface PlaylistManagerProps {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>
  currentPlaylist: Playlist
  onPlaylistUpdate: (playlist: Playlist) => void
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  socket,
  currentPlaylist,
  onPlaylistUpdate
}) => {
  const [showPlaylist, setShowPlaylist] = useState(false)

  const handleFolderLoad = (videos: MediaElement[]) => {
    const newPlaylist: Playlist = {
      items: [...currentPlaylist.items, ...videos],
      currentIndex: currentPlaylist.currentIndex === -1 ? 0 : currentPlaylist.currentIndex
    }

    // Обновляем плейлист на сервере
    socket.emit("updatePlaylist", newPlaylist)
    onPlaylistUpdate(newPlaylist)

    // Если ничего не играет, начинаем с первого видео
    if (currentPlaylist.currentIndex === -1 && videos.length > 0) {
      socket.emit("playItemFromPlaylist", 0)
    }

    alert(`✅ Добавлено ${videos.length} видео в плейлист!`)
  }

  const handleRemoveItem = (index: number) => {
    const newItems = currentPlaylist.items.filter((_, i) => i !== index)
    const newIndex = currentPlaylist.currentIndex > index 
      ? currentPlaylist.currentIndex - 1 
      : currentPlaylist.currentIndex

    const newPlaylist: Playlist = {
      items: newItems,
      currentIndex: newIndex
    }

    socket.emit("updatePlaylist", newPlaylist)
    onPlaylistUpdate(newPlaylist)
  }

  const handleClearPlaylist = () => {
    if (confirm("Очистить весь плейлист?")) {
      const emptyPlaylist: Playlist = {
        items: [],
        currentIndex: -1
      }
      socket.emit("updatePlaylist", emptyPlaylist)
      onPlaylistUpdate(emptyPlaylist)
    }
  }

  const handlePlayItem = (index: number) => {
    socket.emit("playItemFromPlaylist", index)
  }

  return (
    <div className="playlist-manager">
      <div className="playlist-controls">
        <FolderUpload onFolderLoad={handleFolderLoad} />
        
        <button 
          onClick={() => setShowPlaylist(!showPlaylist)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginLeft: "10px"
          }}
        >
          📋 Плейлист ({currentPlaylist.items.length})
        </button>

        {currentPlaylist.items.length > 0 && (
          <button 
            onClick={handleClearPlaylist}
            style={{
              padding: "10px 20px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginLeft: "10px"
            }}
          >
            🗑️ Очистить
          </button>
        )}
      </div>

      {showPlaylist && (
        <div className="playlist-items" style={{
          marginTop: "20px",
          maxHeight: "400px",
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: "5px",
          padding: "10px"
        }}>
          <h3>Плейлист ({currentPlaylist.items.length} видео)</h3>
          
          {currentPlaylist.items.length === 0 ? (
            <p style={{ color: "#999" }}>Плейлист пуст. Загрузите папку с видео.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {currentPlaylist.items.map((item, index) => (
                <li 
                  key={index}
                  style={{
                    padding: "10px",
                    marginBottom: "5px",
                    backgroundColor: currentPlaylist.currentIndex === index ? "#e7f3ff" : "#f9f9f9",
                    border: currentPlaylist.currentIndex === index ? "2px solid #007bff" : "1px solid #ddd",
                    borderRadius: "5px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong>{index + 1}.</strong> {item.title || "Без названия"}
                    {currentPlaylist.currentIndex === index && (
                      <span style={{ marginLeft: "10px", color: "#007bff" }}>▶️ Играет</span>
                    )}
                  </div>

                  <div>
                    {currentPlaylist.currentIndex !== index && (
                      <button
                        onClick={() => handlePlayItem(index)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          marginRight: "5px"
                        }}
                      >
                        ▶️
                      </button>
                    )}

                    <button
                      onClick={() => handleRemoveItem(index)}
                      style={{
                        padding: "5px 10px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <style jsx>{`
        .playlist-manager {
          margin: 20px 0;
        }
        .playlist-controls {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  )
}