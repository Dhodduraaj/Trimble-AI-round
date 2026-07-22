export default function EntryList({ entries }) {
  const total = entries.reduce((sum, entry) => sum + entry.displayAmount, 0);

  return (
    <section data-testid="entry-list">
      <h2>Entries</h2>
      {entries.length === 0 ? (
        <p data-testid="entry-empty">No entries found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} data-testid="entry-row">
                <td>{entry.spent_on}</td>
                <td>{entry.category}</td>
                <td>{entry.description || "-"}</td>
                <td data-testid="entry-row-amount">${entry.displayAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="total" data-testid="total-amount">
        Total: ${total.toFixed(2)}
      </p>
    </section>
  );
}
