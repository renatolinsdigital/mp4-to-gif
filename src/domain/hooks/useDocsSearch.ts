import { useSearchParams } from 'react-router';

import { DOCS_SECTIONS } from '@/domain/helpers/docsContent';
import { searchDocs, searchTerms } from '@/domain/helpers/docsSearch';

const QUERY_PARAM = 'q';

/** Docs search, kept in the URL (`/docs?q=dither`) so a search can be shared or bookmarked. */
export function useDocsSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get(QUERY_PARAM) ?? '';

  const setQuery = (next: string) => {
    setSearchParams(
      (params) => {
        if (next.trim() === '') params.delete(QUERY_PARAM);
        else params.set(QUERY_PARAM, next);
        return params;
      },
      // Typing shouldn't add one history entry per keystroke.
      { replace: true, preventScrollReset: true },
    );
  };

  return { query, setQuery, terms: searchTerms(query), ...searchDocs(DOCS_SECTIONS, query) };
}
