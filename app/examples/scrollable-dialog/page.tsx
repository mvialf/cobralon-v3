'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import {
  ScrollableDialog,
  ScrollableDialogBody,
  ScrollableDialogClose,
  ScrollableDialogContent,
  ScrollableDialogDescription,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
  ScrollableDialogTitle,
  ScrollableDialogTrigger,
} from '@/components/ui/scrollable-dialog'

export default function ScrollableDialogExamplePage() {
  return (
    <AppLayout
      pageTitle="Scrollable Dialog"
      pageDescription="Dialog con contenido scrolleable y validación opcional de lectura completa"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/examples' },
        { label: 'Scrollable Dialog' },
      ]}
    >
      <div className="space-y-8">
        {/* Demo 1: Dialog simple (sin scroll requirement) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">1. Dialog Simple</h2>
            <p className="text-muted-foreground text-sm">
              Contenido scrolleable sin validación de lectura completa
            </p>
          </div>

          <ScrollableDialog>
            <ScrollableDialogTrigger asChild>
              <Button variant="outline">Abrir Información</Button>
            </ScrollableDialogTrigger>
            <ScrollableDialogContent>
              <ScrollableDialogHeader>
                <ScrollableDialogTitle>Información del Producto</ScrollableDialogTitle>
              </ScrollableDialogHeader>
              <ScrollableDialogBody>
                <ScrollableDialogDescription asChild>
                  <div className="space-y-4">
                    <p>
                      Este es un ejemplo de dialog scrolleable que no requiere que el usuario lea
                      todo el contenido antes de cerrar.
                    </p>
                    <p>
                      Es útil para mostrar información larga como descripciones de productos,
                      detalles de transacciones, o cualquier contenido que pueda exceder el alto
                      visible.
                    </p>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Características:</h3>
                      <ul className="list-disc space-y-1 pl-6">
                        <li>Header fijo en la parte superior</li>
                        <li>Contenido scrolleable en el medio</li>
                        <li>Footer fijo en la parte inferior</li>
                        <li>Sin validación de scroll</li>
                      </ul>
                    </div>
                  </div>
                </ScrollableDialogDescription>
              </ScrollableDialogBody>
              <ScrollableDialogFooter>
                <ScrollableDialogClose asChild>
                  <Button>Cerrar</Button>
                </ScrollableDialogClose>
              </ScrollableDialogFooter>
            </ScrollableDialogContent>
          </ScrollableDialog>
        </section>

        {/* Demo 2: Terms & Conditions (con scroll requirement) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">2. Términos y Condiciones</h2>
            <p className="text-muted-foreground text-sm">
              Requiere scrollear hasta el final antes de aceptar (threshold 99%)
            </p>
          </div>

          <ScrollableDialog>
            <ScrollableDialogTrigger asChild>
              <Button variant="outline">Ver Términos y Condiciones</Button>
            </ScrollableDialogTrigger>
            <ScrollableDialogContent requireScrollToBottom>
              <ScrollableDialogHeader>
                <ScrollableDialogTitle>Términos y Condiciones</ScrollableDialogTitle>
              </ScrollableDialogHeader>
              <ScrollableDialogBody>
                <ScrollableDialogDescription asChild>
                  <div className="space-y-4 [&_strong]:font-semibold [&_strong]:text-foreground">
                    <div className="space-y-1">
                      <p>
                        <strong>Aceptación de Términos</strong>
                      </p>
                      <p>
                        Al acceder y utilizar este sitio web, los usuarios aceptan cumplir y estar
                        sujetos a estos Términos de Servicio. Los usuarios que no estén de acuerdo
                        con estos términos deben descontinuar el uso del sitio web de inmediato.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Responsabilidades de la Cuenta de Usuario</strong>
                      </p>
                      <p>
                        Los usuarios son responsables de mantener la confidencialidad de sus
                        credenciales de cuenta. Cualquier actividad que ocurra bajo la cuenta de un
                        usuario es responsabilidad exclusiva del titular de la cuenta. Los usuarios
                        deben notificar inmediatamente a los administradores del sitio web de
                        cualquier acceso no autorizado a la cuenta.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Uso de Contenido y Restricciones</strong>
                      </p>
                      <p>
                        El sitio web y su contenido original están protegidos por leyes de propiedad
                        intelectual. Los usuarios no pueden reproducir, distribuir, modificar, crear
                        obras derivadas o explotar comercialmente cualquier contenido sin permiso
                        explícito por escrito de los propietarios del sitio web.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Limitación de Responsabilidad</strong>
                      </p>
                      <p>
                        El sitio web proporciona contenido "tal cual" sin garantías. Los
                        propietarios del sitio web no serán responsables de daños directos,
                        indirectos, incidentales, consecuentes o punitivos que surjan de las
                        interacciones del usuario con la plataforma.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Pautas de Conducta del Usuario</strong>
                      </p>
                      <ul className="list-disc space-y-1 pl-6">
                        <li>No subir contenido dañino o malicioso</li>
                        <li>Respetar los derechos de otros usuarios</li>
                        <li>
                          Evitar actividades que puedan interrumpir la funcionalidad del sitio
                        </li>
                        <li>Cumplir con las leyes locales e internacionales aplicables</li>
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Modificaciones a los Términos</strong>
                      </p>
                      <p>
                        El sitio web se reserva el derecho de modificar estos términos en cualquier
                        momento. El uso continuado del sitio web después de los cambios constituye
                        la aceptación de los nuevos términos.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Cláusula de Terminación</strong>
                      </p>
                      <p>
                        El sitio web puede terminar o suspender el acceso de usuarios sin previo
                        aviso por violaciones de estos términos o por cualquier otra razón que la
                        administración considere apropiada.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Ley Aplicable</strong>
                      </p>
                      <p>
                        Estos términos se rigen por las leyes de la jurisdicción donde opera
                        principalmente el sitio web, sin considerar los principios de conflicto de
                        leyes.
                      </p>
                    </div>
                  </div>
                </ScrollableDialogDescription>
              </ScrollableDialogBody>
              <ScrollableDialogFooter disableUntilScrolled>
                <ScrollableDialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </ScrollableDialogClose>
                <ScrollableDialogClose asChild>
                  <Button>Acepto</Button>
                </ScrollableDialogClose>
              </ScrollableDialogFooter>
            </ScrollableDialogContent>
          </ScrollableDialog>
        </section>

        {/* Demo 3: Payment Invoice */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">3. Factura de Pago Detallada</h2>
            <p className="text-muted-foreground text-sm">
              Dialog con muchos items, requiere scroll para confirmar
            </p>
          </div>

          <ScrollableDialog>
            <ScrollableDialogTrigger asChild>
              <Button variant="outline">Ver Factura Detallada</Button>
            </ScrollableDialogTrigger>
            <ScrollableDialogContent
              requireScrollToBottom
              scrollMessage="Revisa todos los items antes de confirmar el pago."
            >
              <ScrollableDialogHeader>
                <ScrollableDialogTitle>Factura #12345</ScrollableDialogTitle>
              </ScrollableDialogHeader>
              <ScrollableDialogBody>
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-2 font-semibold">Cliente</h3>
                    <p className="text-sm">Juan Pérez</p>
                    <p className="text-muted-foreground text-sm">juan.perez@example.com</p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold">Items</h3>
                    <div className="space-y-2">
                      {Array.from({ length: 15 }, (_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between border-b pb-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">Producto {i + 1}</p>
                            <p className="text-muted-foreground text-xs">
                              Código: PROD-{String(i + 1).padStart(3, '0')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ${((i + 1) * 100).toLocaleString('es-CL')}
                            </p>
                            <p className="text-muted-foreground text-xs">x{i + 1} unidades</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">$12,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA (19%):</span>
                        <span className="font-medium">$2,280</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 text-base">
                        <span className="font-semibold">Total:</span>
                        <span className="font-semibold">$14,280</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-md p-4 text-sm">
                    <p className="font-semibold">Términos de Pago:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                      <li>Pago neto a 30 días desde la fecha de emisión</li>
                      <li>Recargos por mora: 2% mensual</li>
                      <li>No se aceptan devoluciones después de 15 días</li>
                    </ul>
                  </div>
                </div>
              </ScrollableDialogBody>
              <ScrollableDialogFooter disableUntilScrolled>
                <ScrollableDialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </ScrollableDialogClose>
                <ScrollableDialogClose asChild>
                  <Button>Confirmar Pago</Button>
                </ScrollableDialogClose>
              </ScrollableDialogFooter>
            </ScrollableDialogContent>
          </ScrollableDialog>
        </section>

        {/* Demo 4: Custom Threshold */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">4. Threshold Customizado</h2>
            <p className="text-muted-foreground text-sm">
              Requiere solo scrollear al 80% del contenido (threshold 0.8)
            </p>
          </div>

          <ScrollableDialog>
            <ScrollableDialogTrigger asChild>
              <Button variant="outline">Abrir con Threshold 80%</Button>
            </ScrollableDialogTrigger>
            <ScrollableDialogContent
              requireScrollToBottom
              scrollThreshold={0.8}
              scrollMessage="Scrollea al menos 80% del contenido."
            >
              <ScrollableDialogHeader>
                <ScrollableDialogTitle>Política de Privacidad</ScrollableDialogTitle>
              </ScrollableDialogHeader>
              <ScrollableDialogBody>
                <ScrollableDialogDescription asChild>
                  <div className="space-y-4">
                    <p>
                      Este dialog tiene un threshold de 0.8, lo que significa que el botón de
                      aceptar se habilitará cuando el usuario haya scrolleado al menos el 80% del
                      contenido.
                    </p>
                    {Array.from({ length: 8 }, (_, i) => (
                      <p key={i}>
                        Párrafo {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
                        ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
                        ex ea commodo consequat.
                      </p>
                    ))}
                  </div>
                </ScrollableDialogDescription>
              </ScrollableDialogBody>
              <ScrollableDialogFooter disableUntilScrolled>
                <ScrollableDialogClose asChild>
                  <Button variant="outline">Rechazar</Button>
                </ScrollableDialogClose>
                <ScrollableDialogClose asChild>
                  <Button>Aceptar</Button>
                </ScrollableDialogClose>
              </ScrollableDialogFooter>
            </ScrollableDialogContent>
          </ScrollableDialog>
        </section>

        {/* Code Example */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Ejemplo de Código</h2>
            <p className="text-muted-foreground text-sm">API del componente</p>
          </div>

          <div className="bg-muted rounded-md p-4">
            <pre className="overflow-x-auto text-xs">
              {`<ScrollableDialog>
  <ScrollableDialogTrigger asChild>
    <Button>Abrir Terms</Button>
  </ScrollableDialogTrigger>
  <ScrollableDialogContent
    requireScrollToBottom    // Requiere scroll al final
    scrollThreshold={0.99}   // 99% del contenido
    scrollMessage="Leer todo antes de aceptar."
  >
    <ScrollableDialogHeader>
      <ScrollableDialogTitle>Términos</ScrollableDialogTitle>
    </ScrollableDialogHeader>
    <ScrollableDialogBody>
      <p>Contenido largo aquí...</p>
    </ScrollableDialogBody>
    <ScrollableDialogFooter disableUntilScrolled>
      <ScrollableDialogClose asChild>
        <Button variant="outline">Cancelar</Button>
      </ScrollableDialogClose>
      <ScrollableDialogClose asChild>
        <Button>Aceptar</Button>
      </ScrollableDialogClose>
    </ScrollableDialogFooter>
  </ScrollableDialogContent>
</ScrollableDialog>`}
            </pre>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold">Props Principales:</h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <code className="text-xs">requireScrollToBottom</code>: Si es true, requiere scroll
                completo (default: false)
              </li>
              <li>
                <code className="text-xs">scrollThreshold</code>: Porcentaje de scroll necesario 0-1
                (default: 0.99)
              </li>
              <li>
                <code className="text-xs">scrollMessage</code>: Mensaje mostrado en footer
              </li>
              <li>
                <code className="text-xs">disableUntilScrolled</code>: Deshabilita botones hasta
                completar scroll
              </li>
            </ul>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
