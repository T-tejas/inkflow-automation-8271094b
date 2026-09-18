function getFollowupStatus(date) {
  if (!date) return "none";
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const followup = new Date(date);
  followup.setHours(0, 0, 0, 0);
  const diff = followup.getTime() - today.getTime();
  if (diff === 0) return "today";
  if (diff < 0) return "overdue";
  return "upcoming";
}
const LEAD_STATUSES = [
  "New Lead",
  "Contacted",
  "Interested",
  "Artist Consultation",
  "Negotiating",
  "Booked",
  "Completed",
  "No Response",
  "Cancelled",
  "Out of City",
  "Student Inquiry",
  "Low Budget"
];
const KANBAN_STATUSES = [
  "New Lead",
  "Contacted",
  "Interested",
  "Artist Consultation",
  "Negotiating",
  "Booked",
  "Completed",
  "No Response",
  // "No Response / Cancelled" column
  "Out of City",
  "Student Inquiry",
  "Low Budget"
];
const LEAD_SOURCES = ["Instagram", "WhatsApp", "Walk-in", "Referral", "Website", "Facebook"];
const TATTOO_STYLES = [
  "Traditional",
  "Neo-Traditional",
  "Realism",
  "Watercolor",
  "Geometric",
  "Minimalist",
  "Japanese",
  "Tribal",
  "Blackwork",
  "Dotwork",
  "Lettering",
  "Portrait",
  "Minimal",
  "Other"
];
const TATTOO_SIZES = [
  "Small (2-4 in)",
  "Medium (4-6 in)",
  "Large (6-10 in)",
  "Extra Large (10+ in)",
  "Full Sleeve",
  "Half Sleeve"
];
const AUTOMATION_TAGS = [
  "whatsapp_inquiry",
  "booked_whatsapp",
  "happy_client",
  "repeat_client"
];
const STATUS_COLORS = {
  "New Lead": "bg-pipeline-new",
  "Contacted": "bg-pipeline-contacted",
  "Interested": "bg-pipeline-interested",
  "Artist Consultation": "bg-orange-500",
  "Negotiating": "bg-pipeline-negotiating",
  "Booked": "bg-pipeline-booked",
  "Completed": "bg-pipeline-completed",
  "No Response": "bg-pipeline-no-response",
  "Cancelled": "bg-pipeline-cancelled",
  "Out of City": "bg-sky-500",
  "Student Inquiry": "bg-violet-500",
  "Low Budget": "bg-amber-500"
};
const STATUS_TEXT_COLORS = {
  "New Lead": "text-pipeline-new",
  "Contacted": "text-pipeline-contacted",
  "Interested": "text-pipeline-interested",
  "Artist Consultation": "text-orange-500",
  "Negotiating": "text-pipeline-negotiating",
  "Booked": "text-pipeline-booked",
  "Completed": "text-pipeline-completed",
  "No Response": "text-pipeline-no-response",
  "Cancelled": "text-pipeline-cancelled",
  "Out of City": "text-sky-500",
  "Student Inquiry": "text-violet-500",
  "Low Budget": "text-amber-500"
};
function parseBudget(budget) {
  if (!budget) return 0;
  const cleaned = budget.replace(/[₹,\s]/g, "");
  const kMatch = cleaned.match(/([\d.]+)\s*[kK]/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1e3);
  const lMatch = cleaned.match(/([\d.]+)\s*[lL]/);
  if (lMatch) return Math.round(parseFloat(lMatch[1]) * 1e5);
  const numbers = cleaned.match(/\d+/g);
  if (!numbers) return 0;
  return Math.max(...numbers.map(Number));
}
export {
  AUTOMATION_TAGS,
  KANBAN_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  STATUS_COLORS,
  STATUS_TEXT_COLORS,
  TATTOO_SIZES,
  TATTOO_STYLES,
  getFollowupStatus,
  parseBudget
};
