export const toISO = (date: string) => {
    if (!date) return '';
    const sep = date.includes('/') ? '/' : date.includes('-') ? '-' : null;
    if (!sep) return date;
    const parts = date.split(sep).map(p => p.trim());
    if (parts.length !== 3) return date;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

export const getLocalISODate = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

