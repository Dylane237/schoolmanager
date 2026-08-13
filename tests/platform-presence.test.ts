import { describe, expect, it } from 'vitest'
import { readPlatformPresenceFromStats } from '@/lib/platform-presence'

describe('platform-presence', () => {
  it('reads desktop and web flags from dashboard_stats', () => {
    expect(readPlatformPresenceFromStats({ desktop_ever_used: true })).toEqual({
      desktop_ever_used: true,
      web_ever_used: false,
    })
    expect(readPlatformPresenceFromStats({ web_ever_used: true })).toEqual({
      desktop_ever_used: false,
      web_ever_used: true,
    })
    expect(readPlatformPresenceFromStats(null)).toEqual({
      desktop_ever_used: false,
      web_ever_used: false,
    })
  })
})
