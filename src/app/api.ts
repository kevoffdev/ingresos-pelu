import { DayRecord } from "./types";


const APPS_SCRIPT_URL = "/api/gs"; // Proxy route (server-side) to avoid CORS. See app/api/gs/route.ts
const loadFromGoogleSheets = async () => {
  // Use the server-side proxy which forwards to your Apps Script.
  try {
    const res = await fetch('/api/gs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getAll' }),
    });

    if (!res.ok) return [];

    const data = await res.json();

    // Expecting Apps Script to return an array like: [{ date: 'dd/mm/yyyy', cuts: ['10000','12000'] }, ...]
    const parsed: DayRecord[] = (data || [])
      .map((row: any) => ({
        date: row.date,
        cuts: (row.cuts || [])
          .map((c: any) => Number(String(c).trim()))
          .filter((n: number) => !isNaN(n)),
      }))
      .filter((r: DayRecord) => r.date);

    return parsed;
  } catch (err) {
    console.error('Failed to load from Google Sheets via proxy', err);
    return [];
  }
};

export const addCutToGoogleSheets = async (date: string, price: number) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "addCut",
        date: date,
        price: price,
      }),
    });

    if (!response.ok) {
      throw new Error("Error adding cut to Google Sheets");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

export const deleteCutFromGoogleSheets = async (date: string, index: number) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "deleteCut",
        date: date,
        index: index,
      }),
    });

    if (!response.ok) {
      throw new Error("Error deleting cut from Google Sheets");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

export const deleteEntireDateFromGoogleSheets = async (date: string) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "deleteDate",
        date: date,
      }),
    });

    if (!response.ok) {
      throw new Error("Error deleting date from Google Sheets");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

export default loadFromGoogleSheets;