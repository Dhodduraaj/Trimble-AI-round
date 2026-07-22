import { useState } from "react";
import { createEntry } from "../api/client";

const today = new Date().toISOString().slice(0, 10);

export default function EntryForm({ onCreated }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [spentOn, setSpentOn] = useState(today);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await createEntry({
        amount,
        category,
        description,
        spent_on: spentOn,
      });
      setMessage("Entry created successfully.");
      setAmount("");
      setDescription("");
      if (onCreated) {
        onCreated();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section data-testid="entry-form">
      <h2>Add Spend Entry</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Amount
          <input
            data-testid="entry-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          Category
          <select
            data-testid="entry-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="food">Food</option>
            <option value="transport">Transport</option>
            <option value="entertainment">Entertainment</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Description
          <input
            data-testid="entry-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Date
          <input
            data-testid="entry-date"
            type="date"
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
            required
          />
        </label>
        <button data-testid="entry-submit" type="submit">
          Save Entry
        </button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
