// pages/api/cleanup.ts
import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    
    if (!fs.existsSync(uploadsDir)) {
      return res.status(200).json({ message: 'Uploads directory does not exist' })
    }

    const files = fs.readdirSync(uploadsDir)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 часа в миллисекундах
    
    let deletedCount = 0
    
    for (const filename of files) {
      const filePath = path.join(uploadsDir, filename)
      const stats = fs.statSync(filePath)
      
      // Удаляем файлы старше 24 часов
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath)
        deletedCount++
      }
    }
    
    res.status(200).json({ 
      message: `Deleted ${deletedCount} old files`,
      deletedCount 
    })
    
  } catch (error) {
    console.error('Cleanup error:', error)
    res.status(500).json({ 
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}