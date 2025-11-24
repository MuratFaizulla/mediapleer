import { NextApiRequest, NextApiResponse } from "next"
import { isUrl, shellSanitizeUrl, isOneDriveUrl, convertOneDriveToDirectUrl } from "../../lib/utils"
import { exec, ExecException } from "child_process"
import * as util from "util"

const asyncExec = util.promisify(exec)

const memoizeExtractFromUrl = () => {
  let cache: Record<string, any> = {}
  return async (url: string) => {
    if (url in cache) {
      const cached = cache[url]
      if (cached.pending) {
        return true
      }
      return cache[url]
    }

    if (!isUrl(url)) {
      console.error("Неверный URL-адрес источника видео:", url)
      cache[url] = {
        error: true,
        stdout: "",
        stderr: "Invalid url",
      }
      return cache[url]
    }

    try {
      // 🔥 НОВОЕ: Проверяем OneDrive ссылки
      if (isOneDriveUrl(url)) {
        const directUrl = convertOneDriveToDirectUrl(url)
        console.log("URL-адрес OneDrive преобразован:", url, "->", directUrl)
        
        cache[url] = {
          error: false,
          stdout: directUrl,
          stderr: "",
        }
        return cache[url]
      }

      // Обычная обработка YouTube через yt-dlp
      cache[url] = await asyncExec("yt-dlp -g " + url)
    } catch (error) {
      const e = error as ExecException
      console.error("Extraction failed", e)
      cache[url] = {
        error: true,
        stdout: "",
        stderr: e.message,
      }
    }

    return cache[url]
  }
}


const extractFromUrl = memoizeExtractFromUrl()

const handleResult = async (url: string, res: NextApiResponse) => {
  const result = await extractFromUrl(url)
  // already pending?
  if (result === true) {
    setTimeout(async () => {
      await handleResult(url, res)
    }, 100)
    return
  }

  if (result.error) {
    console.error(`exec error: ${result.error}`)
    return res.status(500).send(result.stderr.replace("\n", ""))
  }

  res.json({
    stdout: result.stdout,
    stderr: result.stderr.replace("\n", ""),
  })
}

export default async function source(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const url = shellSanitizeUrl(req.body)
  if (!isUrl(url)) {
    return res.status(400).send("Invalid url")
  }
  console.log("Запрошенный источник видео", req.body, "sanitized", url)

  await handleResult(url, res)
}
