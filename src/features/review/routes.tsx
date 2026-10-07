import { Route } from 'react-router'
import { PARTS } from './parts'
import { ReviewDashboard } from './ReviewDashboard'
import { ReviewOverview } from './ReviewOverview'
import { AccountsPage, PopulationPage } from './ReviewSections'

/**
 * The reviews' routes, relative to `/admin`: the list, each review, and a page for each of its parts. A function, not
 * a component, because `Routes` only accepts `Route` elements.
 */
export function reviewRoutes() {
  return (
    <>
      <Route path="reviews" element={<ReviewDashboard />} />
      <Route path="reviews/:taskId" element={<ReviewOverview />} />
      {PARTS.map((part) => (
        <Route
          key={part.key}
          path={`reviews/:taskId/${part.key}`}
          element={part.kind === 'category' ? <AccountsPage category={part.key} /> : <PopulationPage />}
        />
      ))}
    </>
  )
}
