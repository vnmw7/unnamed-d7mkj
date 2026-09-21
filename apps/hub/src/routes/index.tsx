import { createFileRoute, redirect } from '@tanstack/react-router'
import { currentEdition } from '../data/editions'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (currentEdition) {
      // /2026/ is a separate Vite app outside the hub's route tree, so this
      // must be an href redirect (full-document navigation), not a `to`.
      throw redirect({
        href: currentEdition.href,
        replace: true,
      })
    }
  },
  component: () => null,
})
