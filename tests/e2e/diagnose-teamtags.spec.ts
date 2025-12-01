import { test, expect } from '@playwright/test'

/**
 * Test de diagnóstico para TeamTags en eventos de calendario
 */
test.describe('Diagnóstico TeamTags en Calendario', () => {
  test('verificar flujo completo de TeamTags en ProjectEvent', async ({ page }) => {
    // Capturar requests de API
    const apiRequests: { url: string; method: string; body?: any; response?: any }[] = []

    page.on('request', async (request) => {
      if (request.url().includes('/api/')) {
        const entry: any = {
          url: request.url(),
          method: request.method(),
        }
        if (request.method() === 'POST' || request.method() === 'PUT') {
          try {
            entry.body = request.postDataJSON()
          } catch {}
        }
        apiRequests.push(entry)
      }
    })

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const entry = apiRequests.find(r => r.url === response.url())
        if (entry) {
          try {
            entry.response = await response.json()
          } catch {}
        }
      }
    })

    // 1. Navegar al calendario
    console.log('📅 Navegando al calendario...')
    await page.goto('http://localhost:3000/calendar')
    await page.waitForLoadState('networkidle')

    // Screenshot inicial
    await page.screenshot({ path: 'capturas/teamtags-01-calendar.png', fullPage: true })
    console.log('✅ Screenshot: calendar inicial')

    // 2. Buscar si hay eventos existentes con TeamTags
    const existingEvents = await page.locator('[class*="event-card"], [class*="EventCard"]').count()
    console.log(`📊 Eventos existentes en calendario: ${existingEvents}`)

    // 3. Verificar si TeamTags aparecen en eventos existentes
    // El icono Users indica TeamTags
    const teamTagIcons = await page.locator('svg.lucide-users').count()
    console.log(`👥 Iconos de TeamTags visibles: ${teamTagIcons}`)

    // 4. Click en un día para crear evento
    console.log('🖱️ Intentando crear nuevo evento...')

    // Buscar celdas de día clickeables
    const dayCells = page.locator('[data-date], .calendar-day, [class*="day-cell"]')
    const dayCellCount = await dayCells.count()
    console.log(`📆 Celdas de día encontradas: ${dayCellCount}`)

    if (dayCellCount > 0) {
      // Click en la primera celda disponible
      await dayCells.first().click()
      await page.waitForTimeout(500)

      // Screenshot después de click
      await page.screenshot({ path: 'capturas/teamtags-02-after-click.png', fullPage: true })
    }

    // 5. Verificar si hay dialog abierto
    const dialog = page.locator('[role="dialog"]')
    const dialogVisible = await dialog.isVisible().catch(() => false)
    console.log(`📋 Dialog visible: ${dialogVisible}`)

    if (dialogVisible) {
      await page.screenshot({ path: 'capturas/teamtags-03-dialog.png', fullPage: true })

      // 6. Buscar el selector de TeamTags
      const teamTagSelector = page.locator('text=Integrantes').first()
      const teamTagSelectorVisible = await teamTagSelector.isVisible().catch(() => false)
      console.log(`🏷️ Selector de Integrantes visible: ${teamTagSelectorVisible}`)
    }

    // 7. Verificar API responses de calendar-events
    const calendarEventsRequests = apiRequests.filter(r => r.url.includes('calendar-events'))
    console.log('\n📡 API Requests de calendar-events:')
    for (const req of calendarEventsRequests) {
      console.log(`  ${req.method} ${req.url}`)
      if (req.response?.events) {
        console.log(`  → ${req.response.events.length} eventos`)
        // Verificar si algún evento tiene teamTags
        for (const event of req.response.events) {
          const teamTags = event.data?.teamTags || []
          if (teamTags.length > 0) {
            console.log(`  ✅ Evento ${event.type} tiene ${teamTags.length} teamTags`)
          }
        }
      }
    }

    // 8. Log final de diagnóstico
    console.log('\n=== RESUMEN DIAGNÓSTICO ===')
    console.log(`Eventos en calendario: ${existingEvents}`)
    console.log(`TeamTags visibles (iconos): ${teamTagIcons}`)
    console.log(`API requests capturadas: ${apiRequests.length}`)

    // Guardar log completo
    const fs = require('fs')
    fs.writeFileSync(
      'capturas/teamtags-api-log.json',
      JSON.stringify(apiRequests, null, 2)
    )
    console.log('📁 Log guardado en capturas/teamtags-api-log.json')
  })
})
