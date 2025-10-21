'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * ScrollableDialog - Dialog variant with scrollable content and optional scroll-to-bottom requirement
 *
 * @example
 * ```tsx
 * <ScrollableDialog>
 *   <ScrollableDialogTrigger asChild>
 *     <Button>Open Terms</Button>
 *   </ScrollableDialogTrigger>
 *   <ScrollableDialogContent requireScrollToBottom>
 *     <ScrollableDialogHeader>
 *       <ScrollableDialogTitle>Terms & Conditions</ScrollableDialogTitle>
 *     </ScrollableDialogHeader>
 *     <ScrollableDialogBody>
 *       <p>Long content here...</p>
 *     </ScrollableDialogBody>
 *     <ScrollableDialogFooter>
 *       <ScrollableDialogClose asChild>
 *         <Button variant="outline">Cancel</Button>
 *       </ScrollableDialogClose>
 *       <ScrollableDialogClose asChild>
 *         <Button>Accept</Button>
 *       </ScrollableDialogClose>
 *     </ScrollableDialogFooter>
 *   </ScrollableDialogContent>
 * </ScrollableDialog>
 * ```
 */

type ScrollableDialogContextValue = {
  hasScrolledToBottom: boolean
  requireScrollToBottom: boolean
  scrollThreshold: number
  scrollMessage?: string
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
  contentRef: React.RefObject<HTMLDivElement | null>
}

const ScrollableDialogContext = React.createContext<ScrollableDialogContextValue | null>(null)

function useScrollableDialog() {
  const context = React.useContext(ScrollableDialogContext)
  if (!context) {
    throw new Error('useScrollableDialog must be used within ScrollableDialogContent')
  }
  return context
}

function ScrollableDialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="scrollable-dialog" {...props} />
}

function ScrollableDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="scrollable-dialog-trigger" {...props} />
}

function ScrollableDialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="scrollable-dialog-portal" {...props} />
}

function ScrollableDialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="scrollable-dialog-close" {...props} />
}

function ScrollableDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="scrollable-dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className
      )}
      {...props}
    />
  )
}

interface ScrollableDialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean
  /**
   * Si es true, el usuario debe scrollear hasta el final antes de poder interactuar con botones del footer
   * @default false
   */
  requireScrollToBottom?: boolean
  /**
   * Porcentaje de scroll necesario para considerar que se llegó al final (0-1)
   * @default 0.99
   */
  scrollThreshold?: number
  /**
   * Mensaje a mostrar en el footer cuando aún no se ha scrolleado al final
   * @default "Leer todo el contenido antes de continuar."
   */
  scrollMessage?: string
}

function ScrollableDialogContent({
  className,
  children,
  showCloseButton = true,
  requireScrollToBottom = false,
  scrollThreshold = 0.99,
  scrollMessage = 'Leer todo el contenido antes de continuar.',
  ...props
}: ScrollableDialogContentProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = React.useState(!requireScrollToBottom)
  const contentRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!requireScrollToBottom || hasScrolledToBottom) return

      const target = e.currentTarget
      const scrollPercentage = target.scrollTop / (target.scrollHeight - target.clientHeight)

      if (scrollPercentage >= scrollThreshold) {
        setHasScrolledToBottom(true)
      }
    },
    [requireScrollToBottom, hasScrolledToBottom, scrollThreshold]
  )

  // Reset state cuando el dialog se cierra/abre
  React.useEffect(() => {
    if (!requireScrollToBottom) {
      setHasScrolledToBottom(true)
    } else {
      setHasScrolledToBottom(false)
    }
  }, [requireScrollToBottom])

  const contextValue: ScrollableDialogContextValue = {
    hasScrolledToBottom,
    requireScrollToBottom,
    scrollThreshold,
    scrollMessage,
    handleScroll,
    contentRef,
  }

  return (
    <ScrollableDialogPortal>
      <ScrollableDialogOverlay />
      <DialogPrimitive.Content
        data-slot="scrollable-dialog-content"
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 rounded-lg border p-0 shadow-lg duration-200 sm:max-h-[min(640px,80vh)] sm:max-w-lg',
          className
        )}
        {...props}
      >
        <ScrollableDialogContext.Provider value={contextValue}>
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="scrollable-dialog-close"
              className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-3.5 right-4 z-10 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <XIcon />
              <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
          )}
        </ScrollableDialogContext.Provider>
      </DialogPrimitive.Content>
    </ScrollableDialogPortal>
  )
}

function ScrollableDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="scrollable-dialog-header"
      className={cn('contents space-y-0 text-left', className)}
      {...props}
    />
  )
}

function ScrollableDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="scrollable-dialog-title"
      className={cn('border-b px-6 py-4 text-base font-semibold', className)}
      {...props}
    />
  )
}

function ScrollableDialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  const { handleScroll, contentRef } = useScrollableDialog()

  return (
    <div
      ref={contentRef}
      onScroll={handleScroll}
      data-slot="scrollable-dialog-body"
      className={cn('overflow-y-auto px-6 py-4', className)}
      {...props}
    />
  )
}

function ScrollableDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="scrollable-dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

interface ScrollableDialogFooterProps extends React.ComponentProps<'div'> {
  /**
   * Si es true, deshabilita todos los botones hasta que se haya scrolleado al final
   * @default false
   */
  disableUntilScrolled?: boolean
}

function ScrollableDialogFooter({
  className,
  children,
  disableUntilScrolled = false,
  ...props
}: ScrollableDialogFooterProps) {
  const { hasScrolledToBottom, requireScrollToBottom, scrollMessage } = useScrollableDialog()

  const shouldDisable = disableUntilScrolled && requireScrollToBottom && !hasScrolledToBottom
  const showMessage = requireScrollToBottom && !hasScrolledToBottom

  return (
    <div
      data-slot="scrollable-dialog-footer"
      className={cn('border-t px-6 py-4 sm:items-center', className)}
      {...props}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {showMessage && (
          <span className="grow text-xs text-muted-foreground max-sm:text-center">
            {scrollMessage}
          </span>
        )}
        {shouldDisable
          ? React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return React.cloneElement(child as any, {
                  disabled: true,
                })
              }
              return child
            })
          : children}
      </div>
    </div>
  )
}

export {
  ScrollableDialog,
  ScrollableDialogClose,
  ScrollableDialogContent,
  ScrollableDialogDescription,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
  ScrollableDialogBody,
  ScrollableDialogOverlay,
  ScrollableDialogPortal,
  ScrollableDialogTitle,
  ScrollableDialogTrigger,
}
