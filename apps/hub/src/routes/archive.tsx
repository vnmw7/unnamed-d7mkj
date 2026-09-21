import { createFileRoute } from '@tanstack/react-router'
import { EditionCard } from '../components/EditionCard'
import { editionsNewestFirst } from '../data/editions'

export const Route = createFileRoute('/archive')({
  component: ArchivePage,
})

function ArchivePage() {
  return (
    <section className="archive">
      <h1 className="archive-title">Archive</h1>
      <p className="archive-subtitle">
        Every birthday experience, preserved as it shipped.
      </p>
      {editionsNewestFirst.length === 0 ? (
        <p className="archive-empty">The first edition arrives soon.</p>
      ) : (
        <div className="archive-grid">
          {editionsNewestFirst.map((edition) => (
            <EditionCard key={edition.year} edition={edition} />
          ))}
        </div>
      )}
    </section>
  )
}
