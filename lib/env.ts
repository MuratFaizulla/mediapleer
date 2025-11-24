export function getSiteName(): string {
  if ("SITE_NAME" in process.env) {
    return <string>process.env.SITE_NAME
  }

  console.warn("Переменная окружения 'SITE_NAME' не задана, используется значение по умолчанию:", "Web-SyncPlay")
  return "Mediapleer"
}

export function getSiteDomain(): string {
  if ("PUBLIC_DOMAIN" in process.env) {
    const domain = <string>process.env.PUBLIC_DOMAIN
    return domain.replace(/\/+$/, "")
  }

  console.warn(
    "Переменная окружения 'PUBLIC_DOMAIN' не задана, используется значение по умолчанию:",
    "https://web-syncplay.de"
  )
  return "http:10.35.15.28.:3000"
}

export function getRedisURL(): string {
  if ("REDIS_URL" in process.env) {
    return <string>process.env.REDIS_URL
  }

  console.warn(
    "Переменная окружения 'REDIS_URL' не задана, используется значение по умолчанию:",
    "redis://localhost:6379"
  )
  return "redis://localhost:6379"
}

export function getDefaultSrc(): string {
  if ("DEFAULT_SRC" in process.env) {
    return <string>process.env.DEFAULT_SRC
  }

  // console.warn("Переменная окружения 'DEFAULT_SRC' не задана, источник не указан")
  return "https://youtu.be/ReRupRWGs2Y?si=DvBuBHWPWDG0jKFg"
}
