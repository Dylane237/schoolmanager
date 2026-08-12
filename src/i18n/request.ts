import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, isLocale, LOCALE_COOKIE } from './config'
import { loadMessages } from './load-messages'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const stored = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = isLocale(stored) ? stored : defaultLocale

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
