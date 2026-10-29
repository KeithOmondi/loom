import { useEffect } from 'react';

export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | Loom` : 'Loom | connecting you to your community';
    return () => {
      document.title = previous;
    };
  }, [title]);
};
