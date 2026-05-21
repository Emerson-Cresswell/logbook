function padNumber(value) {
  return String(value).padStart(2, "0");
}

function todayISO() {
  const date = new Date();
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "Not recorded";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

window.AppUtils = { padNumber, todayISO, formatDate };
