import { createFileRoute, Link } from '@tanstack/react-router'
import { currentEdition } from '../data/editions'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <section className="home">
      <p className="home-eyebrow">Annual Birthday Archive</p>
      <h1 className="home-title">MOKA DAY</h1>
      {currentEdition && (
        <div className="home-current">
          <span className="home-current-label">Current Edition</span>
          <h2 className="home-current-title">{currentEdition.title}</h2>
          <a className="button-primary" href={currentEdition.href}>
            Enter Experience
          </a>
        </div>
      )}
      <div>
        <Link className="home-archive-link" to="/archive">
          Browse past editions &rarr;
        </Link>
      </div>
    </section>
  )
}

