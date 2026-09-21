import { createFileRoute, Link } from '@tanstack/react-router'
import { currentEdition } from '../data/editions'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <section className="home">
      <p className="home-eyebrow">Every year, a new world for Moka</p>
      <h1 className="home-title">MOKA DAY</h1>
      {currentEdition && (
        <div className="home-current">
          <span className="home-current-label">Now showing</span>
          <h2 className="home-current-title">
            {currentEdition.year} · {currentEdition.title}
          </h2>
          <a className="button-primary" href={currentEdition.href}>
            Enter this year's experience
          </a>
        </div>
      )}
      <Link className="home-archive-link" to="/archive">
        Past birthdays →
      </Link>
    </section>
  )
}
