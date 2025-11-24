// pages/api/upload.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm, File } from 'formidable'
import fs from 'fs'
import path from 'path'

// Отключаем встроенный парсер Next.js для multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Создаем папку uploads если не существует
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Парсим файлы
    const form = new IncomingForm({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 500 * 1024 * 1024, // 500MB max
      multiples: true
    })

    const [fields, files] = await form.parse(req)
    
    const uploadedFiles: Array<{ filename: string; url: string; size: number }> = []

    // Обрабатываем загруженные файлы
    const fileArray = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean)
    
    for (const file of fileArray) {
      if (file && typeof file === 'object' && 'filepath' in file) {
        const originalName = file.originalFilename || 'unknown'
        const timestamp = Date.now()
        const ext = path.extname(originalName)
        const newFileName = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const newFilePath = path.join(uploadsDir, newFileName)
        
        // Перемещаем файл с временного пути на постоянный
        fs.renameSync(file.filepath, newFilePath)
        
        uploadedFiles.push({
          filename: originalName,
          url: `/uploads/${newFileName}`,
          size: file.size || 0
        })
      }
    }

    res.status(200).json({
      success: true,
      files: uploadedFiles
    })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}