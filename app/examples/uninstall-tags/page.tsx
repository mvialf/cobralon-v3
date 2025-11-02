'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TagSelector, TagBadge } from '@/components/custom/tag-system'
import { useUninstallTags } from '@/hooks/use-uninstall-tags'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function UninstallTagsExamplePage() {
  const {
    // Estado
    availableTags,
    availableColors,
    selectedTags,
    loading,
    error,

    // Setters
    setSelectedTags,

    // CRUD
    createTag,
    editTag,
    deleteTag,
    refreshTags,
    refreshColors,

    // Helpers
    selectTag: _selectTag,
    unselectTag,
    toggleTag,
    isTagSelected,
    clearSelectedTags,
  } = useUninstallTags({
    initialSelected: [],
    autoFetch: true,
  })

  return (
    <AppLayout
      pageTitle="Team Tags - Sistema de Etiquetas"
      pageDescription="Demo completo del sistema de team tags reutilizable"
      breadcrumbs={[{ label: 'Ejemplos', href: '/examples' }, { label: 'Team Tags' }]}
    >
      <div className="space-y-6">
        {/* Estado del sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Estado del Sistema</CardTitle>
            <CardDescription>Información sobre tags disponibles y colores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Cargando tags y colores...</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!loading && !error && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Sistema cargado: {availableTags.length} tags disponibles, {availableColors.length}{' '}
                  colores, {selectedTags.length} tags seleccionadas
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button variant="outline" onClick={refreshTags} disabled={loading}>
                Refrescar Tags
              </Button>
              <Button variant="outline" onClick={refreshColors} disabled={loading}>
                Refrescar Colores
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selector de Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tag Selector</CardTitle>
            <CardDescription>
              Componente principal con CRUD completo (crear, editar, eliminar tags)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagSelector
              selectedTags={selectedTags}
              availableTags={availableTags}
              availableColors={availableColors}
              onTagsChange={setSelectedTags}
              onCreateTag={createTag}
              onEditTag={editTag}
              onDeleteTag={deleteTag}
              label="Team Tags"
              placeholder="Seleccionar tags..."
            />
          </CardContent>
        </Card>

        {/* Tags Seleccionadas */}
        <Card>
          <CardHeader>
            <CardTitle>Tags Seleccionadas ({selectedTags.length})</CardTitle>
            <CardDescription>
              Vista de las tags actualmente seleccionadas con acciones disponibles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay tags seleccionadas</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <TagBadge
                      key={tag.id}
                      tag={tag}
                      removable
                      onRemove={(tagId) => unselectTag(tagId)}
                    />
                  ))}
                </div>

                <Button variant="outline" size="sm" onClick={clearSelectedTags}>
                  Limpiar Todas
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Todas las Tags Disponibles */}
        <Card>
          <CardHeader>
            <CardTitle>Todas las Tags Disponibles</CardTitle>
            <CardDescription>
              Lista completa de tags con acciones individuales (click para
              seleccionar/deseleccionar)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay tags disponibles. Crea una usando el selector de arriba.
              </p>
            ) : (
              <div className="space-y-2">
                {availableTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => toggleTag(tag)}
                  >
                    <div className="flex items-center gap-3">
                      <TagBadge tag={tag} />
                      <div>
                        <p className="text-sm font-medium">{tag.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Color: {tag.color?.name || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {isTagSelected(tag.id) ? 'Seleccionada' : 'No seleccionada'}
                      </span>
                      <Button
                        variant={isTagSelected(tag.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTag(tag)
                        }}
                      >
                        {isTagSelected(tag.id) ? 'Quitar' : 'Seleccionar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paleta de Colores */}
        <Card>
          <CardHeader>
            <CardTitle>Paleta de Colores Disponibles</CardTitle>
            <CardDescription>
              {availableColors.length} colores reutilizables desde BadgeColor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableColors.map((color) => (
                <div key={color.id} className="border rounded-lg p-4 space-y-2">
                  <div
                    className={`h-16 rounded ${color.bgClass} ${color.textClass} flex items-center justify-center font-bold`}
                  >
                    {color.key.toUpperCase()}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{color.name}</p>
                    <p className="text-xs text-muted-foreground">{color.key}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documentación de Uso */}
        <Card>
          <CardHeader>
            <CardTitle>Documentación de Uso</CardTitle>
            <CardDescription>Cómo integrar el sistema en tu código</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">1. Importar Hook y Componente</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {`import { useUninstallTags } from '@/hooks/use-uninstall-tags'
import { TagSelector } from '@/components/custom/tag-system'`}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">2. Usar el Hook</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {`const {
  selectedTags,
  availableTags,
  availableColors,
  createTag,
  editTag,
  deleteTag,
  setSelectedTags,
} = useUninstallTags({
  initialSelected: [],
  autoFetch: true,
})`}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">3. Renderizar el Selector</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {`<TagSelector
  selectedTags={selectedTags}
  availableTags={availableTags}
  onTagsChange={setSelectedTags}
  onCreateTag={createTag}
  onEditTag={editTag}
  onDeleteTag={deleteTag}
  label="Team Tags"
/>`}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">4. Features Principales</h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>CRUD completo desde la UI (crear, editar, eliminar)</li>
                  <li>Auto-generación de abreviaturas de 2 letras</li>
                  <li>Selector de color dinámico desde BadgeColor</li>
                  <li>Validación de nombres únicos</li>
                  <li>Selección/deselección instantánea (sin botón "Aceptar")</li>
                  <li>Vista previa en tiempo real</li>
                  <li>Estados de loading y error manejados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
