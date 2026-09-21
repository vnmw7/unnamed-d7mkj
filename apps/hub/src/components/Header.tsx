import { Link } from '@tanstack/react-router'

export function Header() {
  return (
    <header className="site-header">
      <Link className="site-brand" to="/">
        MOKA DAY
      </Link>
      <nav className="site-nav">
        <Link to="/">Home</Link>
        <Link to="/archive">Archive</Link>
      </nav>
    </header>
  )
}
