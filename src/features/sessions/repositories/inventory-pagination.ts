interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

/** Advance by received rows: deployments may cap responses below our page size. */
export async function readInventoryPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ data: T[]; error: null }> {
  const data: T[] = [];
  for (;;) {
    const page = await fetchPage(data.length, data.length + 199);
    if (page.error) throw page.error;
    if (!page.data?.length) return { data, error: null };
    data.push(...page.data);
  }
}

export async function readInventoryAttributes<T>(
  ids: string[],
  fetchPage: (
    ids: string[],
    from: number,
    to: number
  ) => PromiseLike<PageResult<T>>
) {
  const data: T[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const page = await readInventoryPages((from, to) =>
      fetchPage(ids.slice(i, i + 100), from, to)
    );
    data.push(...page.data);
  }
  return { data, error: null };
}
