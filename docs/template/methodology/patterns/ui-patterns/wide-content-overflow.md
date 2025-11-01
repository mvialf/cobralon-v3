# Patrón de Contenido Wide (Overflow Horizontal)

## Regla

**Cuando trabajes con contenido que puede exceder el ancho del viewport, usa el patrón Card Wrapper con overflow containment para prevenir scroll horizontal duplicado.**

## El Problema

Sin manejo correcto del overflow:

- ❌ **Scroll a nivel de página:** Toda la aplicación (sidebar, header, contenido) se mueve horizontalmente
- ❌ **Scroll a nivel de contenido:** El contenido también tiene su propio scroll
- ❌ **UX pobre:** Usuario confundido por scroll duplicado, especialmente en mobile

## ✅ Correcto: Card Wrapper con Overflow Containment

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
;<Card className="overflow-hidden">
  {' '}
  {/* ← Contiene el overflow */}
  <CardHeader>
    <CardTitle>Título del Contenido</CardTitle>
  </CardHeader>
  <CardContent className="overflow-x-auto">
    {' '}
    {/* ← Permite scroll interno */}
    {/* Tu contenido wide aquí: DataTable, imagen, code block, etc. */}
  </CardContent>
</Card>
```

## ❌ Incorrecto

```tsx
// Sin manejo de overflow
<Card>
  <CardContent>
    <DataTable columns={manyColumns} data={data} />
    {/* Scroll se escapa del Card y afecta toda la página */}
  </CardContent>
</Card>

// Con solo overflow-x-auto (sin containment)
<Card>
  <CardContent className="overflow-x-auto">
    <DataTable columns={manyColumns} data={data} />
    {/* Puede crear scroll duplicado */}
  </CardContent>
</Card>
```

## Por Qué Funciona

### 1. `overflow-hidden` en Card

- Previene que el contenido interno "escape" del contenedor
- Elimina el scroll horizontal a nivel de página
- El Card actúa como contenedor de contención

### 2. `overflow-x-auto` en CardContent

- Permite scroll horizontal SOLO dentro del contenedor
- Se activa automáticamente cuando el contenido excede el ancho disponible
- Mantiene el scroll vertical normal

## Casos de Uso

### DataTables con Muchas Columnas (8+)

```tsx
<Card className="overflow-hidden">
  <CardHeader>
    <CardTitle>Listado de Proyectos</CardTitle>
  </CardHeader>
  <CardContent className="overflow-x-auto">
    <DataTable columns={columns} data={data} />
  </CardContent>
</Card>
```

### Imágenes Muy Anchas

```tsx
<Card className="overflow-hidden">
  <CardContent className="overflow-x-auto">
    <img src="/wide-diagram.png" alt="Diagrama" className="w-[2000px]" />
  </CardContent>
</Card>
```

### Code Blocks Largos

```tsx
<Card className="overflow-hidden">
  <CardContent className="overflow-x-auto">
    <pre>
      <code>{longCodeSnippet}</code>
    </pre>
  </CardContent>
</Card>
```

### Gráficas Horizontales

```tsx
<Card className="overflow-hidden">
  <CardHeader>
    <CardTitle>Análisis de Ventas</CardTitle>
  </CardHeader>
  <CardContent className="overflow-x-auto">
    <BarChart data={data} width={1200} />
  </CardContent>
</Card>
```

## Resultado

- ✅ **Scroll horizontal:** Solo dentro del Card (donde está el contenido wide)
- ✅ **Página:** Sin scroll horizontal, solo vertical
- ✅ **Mobile:** El contenido es scrollable horizontalmente dentro del Card
- ✅ **Desktop:** Si la ventana es suficientemente ancha, no hay scroll

## Cuándo Aplicar

Aplica este patrón cuando tengas:

- DataTables con 8+ columnas
- Imágenes anchas (>1200px)
- Code blocks largos
- Gráficas/diagramas horizontales
- Contenido generado que puede ser impredeciblemente ancho

## Tailwind Classes Clave

```css
overflow-hidden     /* Contiene el overflow en el contenedor */
overflow-x-auto     /* Permite scroll horizontal si es necesario */
overflow-y-auto     /* Permite scroll vertical si es necesario */
overflow-auto       /* Scroll en ambas direcciones si es necesario */
```

## Ejemplo Completo: DataTable

```tsx
// app/projects/page.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectsTable } from '@/components/tables/projects-table'

export default async function ProjectsPage() {
  const projects = await db.project.findMany()

  return (
    <AppLayout pageTitle="Proyectos">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Listado de Proyectos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ProjectsTable data={projects} />
        </CardContent>
      </Card>
    </AppLayout>
  )
}
```

## Referencias

- [DataTable Best Practices](../../../../components/data-table.md#handling-horizontal-overflow)
- [DataTable Pattern Guide](../../../../components/data-table-pattern.md)
- [Create DataTable Page Tutorial](../../../guides/create-new-datatable-page.md)

---

[← Anterior: Patrón de Diálogos](dialog-pattern.md) | [Volver al índice](../README.md) | [Siguiente: Capture Dialog →](capture-dialog.md)
