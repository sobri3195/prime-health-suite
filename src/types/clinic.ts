export type Payer = "Umum" | "BPJS" | "Asuransi" | "Perusahaan";
export type Gender = "L" | "P";
export type VisitStatus = "waiting" | "in_progress" | "completed" | "cancelled";

export interface Patient {
  id: string;            // No RM
  name: string;
  nik: string;           // raw (masked on render)
  dob: string;           // ISO
  gender: Gender;
  address: string;
  phone: string;         // raw (masked on render)
  payer: Payer;
  allergies: string[];
  emergencyContact: { name: string; phone: string; relation: string };
  complete: boolean;
  lastVisit?: string;    // ISO
  visitCount: number;
}

export interface Visit {
  id: string;
  patientId: string;
  patientName: string;
  doctor: string;
  payer: Payer;
  complaint: string;
  queueNo: number;
  status: VisitStatus;
  registeredAt: string;
  examStartAt?: string;
  finishedAt?: string;
}

export interface DoctorSchedule {
  id: string;
  doctor: string;
  poli: string;
  day: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Minggu";
  start: string; // HH:mm
  end: string;
  quota: number;
  booked: number;
  active: boolean;
}

export interface MasterRow {
  id: string;
  name: string;
  meta?: string;
  extra?: string;
}

export interface ClinicDashboard {
  today: number;
  newPatients: number;
  control: number;
  completed: number;
  waiting: number;
  avgWaitMin: number;
  byPayer: Record<Payer, number>;
  topActions: { name: string; count: number }[];
  monthlyTrend: { month: string; visits: number }[];
  incompletePatients: number;
  todayDoctors: { doctor: string; poli: string; slot: string; load: number }[];
}
