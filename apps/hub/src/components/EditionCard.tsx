import type { Edition } from '../data/editions'

interface EditionCardProps {
  edition: Edition
}

export function EditionCard({ edition }: EditionCardProps) {
  return (
    <a className="edition-card" href={edition.href}>
      <div className="edition-card-cover" aria-hidden="true">
        {edition.cover ? (
          <img src={edition.cover} alt="" loading="lazy" />
        ) : (
          <span className="edition-card-year">{edition.year}</span>
        )}
      </div>
      <div className="edition-card-body">
        <div className="edition-card-heading">
          <h2>{edition.title}</h2>
          <span className={`edition-card-status is-${edition.status}`}>
            {edition.status}
          </span>
        </div>
        <p>{edition.description ?? edition.year}</p>
      </div>
    </a>
  )
}
