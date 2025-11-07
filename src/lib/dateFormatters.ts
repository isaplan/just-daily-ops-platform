<<<<<<< HEAD
/**
 * Date formatters for displaying dates in DD-MM-YY format
 */

/**
 * Format date as DD-MM-YY
 * @param date - Date string, Date object, or null
 * @returns Formatted date string (e.g., "30-10-25") or "-" if invalid
 */
export function formatDateDDMMYY(date: string | Date | null | undefined): string {
  if (!date) return "-";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return "-";
    }

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = String(dateObj.getFullYear()).slice(-2);

    return `${day}-${month}-${year}`;
  } catch {
    return "-";
  }
}

/**
 * Format date with time as DD-MM-YY HH:MM
 * @param date - Date string, Date object, or null
 * @returns Formatted date-time string (e.g., "30-10-25 14:30") or "-" if invalid
 */
export function formatDateDDMMYYTime(date: string | Date | null | undefined): string {
  if (!date) return "-";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return "-";
    }

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = String(dateObj.getFullYear()).slice(-2);
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");

    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch {
    return "-";
  }
}


=======
// Format date as DDMM'YY
export function formatDateDDMMYY(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}${month}'${year}`;
}

// Format date as DDMM'YY HH:MM
export function formatDateDDMMYYTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}${month}'${year} ${hours}:${minutes}`;
}

>>>>>>> origin/main
