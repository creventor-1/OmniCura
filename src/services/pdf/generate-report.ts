import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AssessmentResponse } from "@/schemas/triage";

interface ExportReportOptions {
  assessment: AssessmentResponse;
  symptoms: string;
  date?: string | Date;
  userEmail?: string;
}

export function generateTriagePdfReport({
  assessment,
  symptoms,
  date = new Date(),
  userEmail,
}: ExportReportOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const docWithTable = doc as jsPDF & { lastAutoTable: { finalY: number } };

  const pageWidth = doc.internal.pageSize.getWidth();
  const reportDate =
    typeof date === "string"
      ? new Date(date).toLocaleString("en-US")
      : date.toLocaleString("en-US");

  // 1. Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Omnicura - Clinical Urgency & First-Aid Summary", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "Educational First-Aid Guidance  •  Not a Definitive Clinical Diagnosis",
    14,
    19
  );

  // 2. Metadata Block
  let cursorY = 34;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${reportDate}`, 14, cursorY);
  if (userEmail) {
    doc.text(`Account: ${userEmail}`, pageWidth - 14, cursorY, { align: "right" });
  }

  cursorY += 6;

  // 3. Urgency Classification Box
  const severityColors = {
    "non-urgent": { fill: [236, 253, 245], text: [4, 120, 87], border: [52, 211, 153] }, // Emerald
    urgent: { fill: [254, 243, 199], text: [180, 83, 9], border: [251, 191, 36] }, // Amber
    emergency: { fill: [254, 242, 242], text: [185, 28, 28], border: [248, 113, 113] }, // Red
  }[assessment.severity];

  doc.setFillColor(severityColors.fill[0], severityColors.fill[1], severityColors.fill[2]);
  doc.setDrawColor(severityColors.border[0], severityColors.border[1], severityColors.border[2]);
  doc.roundedRect(14, cursorY, pageWidth - 28, 16, 2, 2, "FD");

  doc.setTextColor(severityColors.text[0], severityColors.text[1], severityColors.text[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    `CLINICAL URGENCY LEVEL: ${assessment.severity.toUpperCase()}`,
    20,
    cursorY + 7
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    assessment.severity === "emergency"
      ? "Immediate professional emergency medical care is strongly advised."
      : assessment.severity === "urgent"
      ? "Evaluation by a healthcare professional is advised within 12–24 hours."
      : "Symptoms may be monitored with appropriate self-care and supportive guidance.",
    20,
    cursorY + 12
  );

  cursorY += 22;

  // 4. Reported Symptoms
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Reported Symptoms:", 14, cursorY);

  cursorY += 4.5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const wrappedSymptoms = doc.splitTextToSize(`"${symptoms}"`, pageWidth - 28);
  doc.text(wrappedSymptoms, 14, cursorY);
  cursorY += wrappedSymptoms.length * 4.5 + 4;

  // 5. Possible Considerations Table
  autoTable(doc, {
    startY: cursorY,
    head: [["Possible Considerations (Educational Considerations Only)"]],
    body: assessment.possibleConditions.map((c) => [`•  ${c}`]),
    theme: "striped",
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    margin: { left: 14, right: 14 },
  });

  cursorY = docWithTable.lastAutoTable.finalY + 6;

  // 6. Rationale & Recommended Actions Table
  autoTable(doc, {
    startY: cursorY,
    head: [["Clinical Evaluation Rationale & Next Steps", "Clinical Guidance"]],
    body: [
      ["Clinical Rationale", assessment.severityReasoning],
      ["Recommended Action", assessment.recommendedAction],
    ],
    theme: "grid",
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 42, fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  });

  cursorY = docWithTable.lastAutoTable.finalY + 6;

  // 7. First Aid & Warning Signs Table
  autoTable(doc, {
    startY: cursorY,
    head: [["Supportive First-Aid Steps", "Critical Escalation Warning Signs"]],
    body: [
      [
        assessment.firstAidSteps.map((s, i) => `${i + 1}. ${s}`).join("\n\n"),
        assessment.warningSigns.map((w) => `⚠ ${w}`).join("\n\n"),
      ],
    ],
    theme: "plain",
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 },
  });

  cursorY = docWithTable.lastAutoTable.finalY + 6;

  // 8. Mandatory Disclaimer Footer Box
  const disclaimerBoxY = Math.max(cursorY, 260);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, disclaimerBoxY, pageWidth - 28, 22, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text("IMPORTANT LEGAL & MEDICAL DISCLAIMER", 18, disclaimerBoxY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  const disclaimerText =
    "Omnicura is an educational decision-support platform. It does not provide medical diagnoses, treatment plans, or emergency dispatch. If symptoms worsen, change, or indicate life-threatening distress, seek immediate care at an accredited hospital or dial emergency medical services (112 / 911) right away.";
  const wrappedDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 36);
  doc.text(wrappedDisclaimer, 18, disclaimerBoxY + 9);

  // Trigger browser download
  const filename = `Omnicura_Assessment_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
