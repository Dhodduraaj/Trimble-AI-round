import { useCallback, useState } from "react";
import { getEntriesByDate, getEntriesInRange } from "./api/client";
import DateFilter from "./components/DateFilter";
import EntryForm from "./components/EntryForm";
import EntryList from "./components/EntryList";

const today = new Date().toISOString().slice(0, 10);

function formatDateForApi(dateInput) {
  return dateInput;
}

function mapEntries(entries) {
  return entries.map((entry) => ({
    ...entry,
    displayAmount: Number(entry.amount),
  }));
}

export default function App() {
  const [mode, setMode] = useState("single");
  const [singleDate, setSingleDate] = useState(today);
  const [fromDate, setFromDate] = useState("2026-07-10");
  const [toDate, setToDate] = useState("2026-07-20");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let data;
      if (mode === "single") {
        const apiDate = formatDateForApi(singleDate);
        data = await getEntriesByDate(apiDate);
      } else {
        data = await getEntriesInRange(fromDate, toDate);
      }
      setEntries(mapEntries(data));
    } catch (err) {
      setError(err.message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [mode, singleDate, fromDate, toDate]);

  return (
    <div>
      <h1>Personal Spend Tracker</h1>
      <p>Track daily spending with simple date filters.</p>

      <EntryForm onCreated={loadEntries} />

      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          data-testid="mode-single"
          onClick={() => setMode("single")}
          style={{ marginRight: "0.5rem", background: mode === "single" ? "#1d4ed8" : "#64748b" }}
        >
          Single Date
        </button>
        <button
          type="button"
          data-testid="mode-range"
          onClick={() => setMode("range")}
          style={{ background: mode === "range" ? "#1d4ed8" : "#64748b" }}
        >
          Date Range
        </button>
      </div>

      <DateFilter
        mode={mode}
        singleDate={singleDate}
        fromDate={fromDate}
        toDate={toDate}
        onSingleDateChange={setSingleDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onSearch={loadEntries}
        loading={loading}
        error={error}
      />

      <EntryList entries={entries} />
    </div>
  );
}
