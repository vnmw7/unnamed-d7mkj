import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'

export const Route = createRootRoute({
  component: () => (
    <div className="site-shell">
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  ),
  notFoundComponent: () => (
    <div className="not-found">
      <h1 className="not-found-title">404</h1>
      <p className="not-found-text">Page not found</p>
      <Link to="/" className="button-primary">
        Return Home
      </Link>
    </div>
  ),
})

