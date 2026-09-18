const SAMPLE = {
  client_name: "Rahul",
  artist_name: "Aman",
  appointment_date: "12 Jun 2026",
  appointment_time: "4:00 PM",
  remaining_amount: "2,500",
  tattoo_style: "Realism",
  design_url: "https://f19tattoo.com/d/abc"
};
function renderBody(body, vars, values, sample = false) {
  let out = body;
  vars.forEach((v) => {
    const val = values[v] ?? (sample ? SAMPLE[v] || `{{${v}}}` : `{{${v}}}`);
    out = out.split(`{{${v}}}`).join(val);
  });
  out = out.replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? (sample ? SAMPLE[k] || `{{${k}}}` : `{{${k}}}`));
  return out;
}
function TemplatePreviewBubble({ body, variables, values = {}, buttons = [], sample = true }) {
  const rendered = renderBody(body, variables, values, sample);
  const html = rendered.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*(.+?)\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
  return <div className="bg-[#e5ddd5] p-4 rounded-lg">
      <div className="max-w-md ml-auto">
        <div className="bg-[#d9fdd3] rounded-lg rounded-tr-sm shadow-sm overflow-hidden">
          <div className="px-3 pt-2 pb-1 text-[14px] leading-snug text-[#111b21]" dangerouslySetInnerHTML={{ __html: html }} />
          <div className="px-3 pb-1.5 text-[10px] text-right text-[#667781]">12:34 PM ✓✓</div>
          {buttons.length > 0 && <div className="border-t border-black/5 bg-white">
              {buttons.map((b, i) => <div key={i} className="border-b border-black/5 last:border-0 px-3 py-2.5 text-center text-[#00a5f4] text-sm font-medium">
                  {b.type === "url" ? "\u{1F517} " : b.type === "phone" ? "\u{1F4DE} " : "\u21A9 "}{b.label}
                </div>)}
            </div>}
        </div>
      </div>
    </div>;
}
export {
  TemplatePreviewBubble,
  renderBody
};
