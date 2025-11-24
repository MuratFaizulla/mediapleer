// components/FolderUpload.tsx
import React, { useRef, useState } from "react"
import { MediaElement, MediaSource } from "../lib/types"

interface FolderUploadProps {
  onFolderLoad: (playlist: MediaElement[]) => void
}

export const FolderUpload: React.FC<FolderUploadProps> = ({ onFolderLoad }) => {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setLoading(true)
    
    // Фильтруем только видео файлы
    const videoFiles = Array.from(files).filter(file => {
      const ext = file.name.toLowerCase()
      return ext.endsWith('.mp4') || 
             ext.endsWith('.mkv') || 
             ext.endsWith('.webm') || 
             ext.endsWith('.avi') ||
             ext.endsWith('.mov')
    })
    
    if (videoFiles.length === 0) {
      setLoading(false)
      alert("Видео файлы не найдены!")
      return
    }
    
    setProgress(`Загрузка ${videoFiles.length} файлов на сервер...`)
    
    try {
      // Создаем FormData для загрузки всех файлов сразу
      const formData = new FormData()
      videoFiles.forEach(file => {
        formData.append('files', file)
      })
      
      // Загружаем файлы на сервер
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка загрузки')
      }
      
      // Создаем плейлист из загруженных файлов
      const playlist: MediaElement[] = result.files.map((file: any) => ({
        title: file.filename,
        src: [{ src: file.url, resolution: "original" }],
        sub: [],
        source: MediaSource.Local,
        originalUrl: file.url
      }))
      
      // Сортируем по имени файла
      playlist.sort((a, b) => 
        (a.title || "").localeCompare(b.title || "")
      )
      
      setProgress(`✅ Загружено ${playlist.length} видео`)
      setTimeout(() => setProgress(""), 2000)
      
      onFolderLoad(playlist)
      
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      setProgress(`❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
      setTimeout(() => setProgress(""), 5000)
    }
    
    setLoading(false)
    
    // Очищаем input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="folder-upload">
      <input
        ref={fileInputRef}
        type="file"
        // @ts-ignore - webkitdirectory не в стандартных типах
        webkitdirectory=""
        directory=""
        multiple
        accept="video/*"
        onChange={handleFolderSelect}
        style={{ display: "none" }}
        id="folder-input"
      />
      
      <label 
        htmlFor="folder-input"
        className={`folder-upload-button ${loading ? "loading" : ""}`}
        style={{
          display: "inline-block",
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          borderRadius: "5px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? "⏳ Загрузка..." : "📁 Загрузить папку с видео"}
      </label>

      {progress && (
        <div style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
          {progress}
        </div>
      )}

      <style jsx>{`
        .folder-upload {
          margin: 10px 0;
        }
        .folder-upload-button:hover:not(.loading) {
          background-color: #0056b3;
        }
      `}</style>
    </div>
  )
}
