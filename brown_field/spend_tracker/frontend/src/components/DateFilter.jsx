export default function DateFilter({
  mode,
  singleDate,
  fromDate,
  toDate,
  onSingleDateChange,
  onFromDateChange,
  onToDateChange,
  onSearch,
  loading,
  error,
}) {
  return (
    <section data-testid="date-filter">
      <h2>Filter Entries</h2>
      {mode === "single" ? (
        <div className="filters">
          <label>
            Date
            <input
              data-testid="filter-date"
              type="date"
              value={singleDate}
              onChange={(e) => onSingleDateChange(e.target.value)}
            />
          </label>
          <button data-testid="filter-submit" type="button" onClick={onSearch} disabled={loading}>
            Search by Date
          </button>
        </div>
      ) : (
        <div className="filters">
          <label>
            From
            <input
              data-testid="filter-from"
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              data-testid="filter-to"
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
            />
          </label>
          <button data-testid="filter-range-submit" type="button" onClick={onSearch} disabled={loading}>
            Search Range
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
