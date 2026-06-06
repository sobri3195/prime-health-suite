import type {
  Patient, Visit, DoctorSchedule, MasterRow, ClinicDashboard, Payer,
} from "@/types/clinic";

const iso = (daysAgo: number, h = 0, m = 0) =>
  new Date(Date.now() - daysAgo * 864e5 - h * 36e5 - m * 6e4).toISOString();

const dobOf = (age: number) =>
  new Date(Date.now() - age * 365.25 * 864e5).toISOString();

export const dashboard: ClinicDashboard = {
  today: 128,
  newPatients: 27,
  control: 64,
  completed: 89,
  waiting: 18,
  avgWaitMin: 22,
  byPayer: { Umum: 41, BPJS: 52, Asuransi: 28, Perusahaan: 7 },
  topActions: [
    { name: "Refraksi", count: 62 },
    { name: "Tonometri", count: 41 },
    { name: "Slit Lamp", count: 38 },
    { name: "Funduskopi", count: 24 },
    { name: "Biometri Pre-op", count: 12 },
  ],
  monthlyTrend: [
    { month: "Jan", visits: 2480 },
    { month: "Feb", visits: 2610 },
    { month: "Mar", visits: 2790 },
    { month: "Apr", visits: 3020 },
    { month: "Mei", visits: 3185 },
    { month: "Jun", visits: 3340 },
  ],
  incompletePatients: 12,
  todayDoctors: [
    { doctor: "dr. Rini, Sp.M", poli: "Poli Umum", slot: "08:00–14:00", load: 96 },
    { doctor: "dr. Bagas, Sp.M", poli: "Poli Refraksi", slot: "09:00–15:00", load: 78 },
    { doctor: "dr. Anisa, Sp.M", poli: "Poli Katarak", slot: "10:00–16:00", load: 64 },
    { doctor: "dr. Hadi, Sp.M(K)", poli: "Poli Retina", slot: "13:00–18:00", load: 52 },
  ],
};

const names = [
  "Andi Saputra", "Nadya Putri", "Bayu Pratama", "Sari Wulandari", "Joko Anggara",
  "Maya Lestari", "Rizky Hidayat", "Putri Ramadhani", "Eko Susanto", "Dewi Anggraini",
  "Fajar Nugraha", "Citra Permata", "Hendra Wijaya", "Lina Marlina", "Gilang Pratomo",
  "Yuni Astuti", "Reza Maulana", "Intan Cahyani", "Bambang Setiawan", "Wulan Sari",
];
const payers: Payer[] = ["Umum", "BPJS", "Asuransi", "Perusahaan"];

export const patients: Patient[] = names.map((n, i) => {
  const age = 22 + ((i * 7) % 50);
  return {
    id: `RM-${String(128 + i).padStart(6, "0")}`,
    name: n,
    nik: `32710${String(1000000 + i * 137).padStart(11, "0")}`,
    dob: dobOf(age),
    gender: i % 2 === 0 ? "L" : "P",
    address: ["Jl. Diponegoro 12", "Jl. Sudirman 88", "Jl. Merdeka 45", "Jl. Hayam Wuruk 7"][i % 4] + ", Jakarta",
    phone: `0812${String(1000000 + i * 311).padStart(8, "0")}`,
    payer: payers[i % 4],
    allergies: i % 5 === 0 ? ["Sulfa"] : i % 7 === 0 ? ["Penisilin", "Latex"] : [],
    emergencyContact: {
      name: names[(i + 3) % names.length],
      phone: `0813${String(2000000 + i * 211).padStart(8, "0")}`,
      relation: ["Suami", "Istri", "Anak", "Orang Tua"][i % 4],
    },
    complete: i % 6 !== 0,
    lastVisit: iso((i * 3) % 60),
    visitCount: 1 + (i % 9),
  };
});

const doctors = ["dr. Rini, Sp.M", "dr. Bagas, Sp.M", "dr. Anisa, Sp.M", "dr. Hadi, Sp.M(K)"];
const statuses: Visit["status"][] = ["waiting", "in_progress", "completed", "cancelled"];
const complaints = [
  "Penglihatan kabur", "Mata merah & gatal", "Kontrol pasca operasi katarak",
  "Cek refraksi rutin", "Nyeri & berair", "Floaters meningkat",
];

export const visits: Visit[] = patients.slice(0, 16).map((p, i) => {
  const status = statuses[i % 4];
  const reg = iso(0, 6 - (i % 6), i * 7);
  return {
    id: `V-${String(20260601 + i).padStart(8, "0")}`,
    patientId: p.id,
    patientName: p.name,
    doctor: doctors[i % doctors.length],
    payer: p.payer,
    complaint: complaints[i % complaints.length],
    queueNo: i + 1,
    status,
    registeredAt: reg,
    examStartAt: status !== "waiting" && status !== "cancelled"
      ? new Date(new Date(reg).getTime() + 18 * 6e4).toISOString() : undefined,
    finishedAt: status === "completed"
      ? new Date(new Date(reg).getTime() + 42 * 6e4).toISOString() : undefined,
  };
});

const days: DoctorSchedule["day"][] = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const polis = ["Poli Umum", "Poli Refraksi", "Poli Katarak", "Poli Retina", "Poli Glaukoma"];

export const schedules: DoctorSchedule[] = [];
let sid = 1;
doctors.forEach((doc, di) => {
  days.forEach((day, idx) => {
    if ((di + idx) % 3 === 0) return;
    const start = 8 + ((di + idx) % 4);
    const dur = 4 + (idx % 3);
    const quota = 20 + (idx % 4) * 5;
    schedules.push({
      id: `SCH-${String(sid++).padStart(4, "0")}`,
      doctor: doc,
      poli: polis[(di + idx) % polis.length],
      day,
      start: `${String(start).padStart(2,"0")}:00`,
      end: `${String(start + dur).padStart(2,"0")}:00`,
      quota,
      booked: Math.floor(quota * (0.4 + ((di + idx) % 6) * 0.1)),
      active: !(di === 3 && idx === 5),
    });
  });
});

export const masterData: Record<string, MasterRow[]> = {
  Dokter: doctors.map((d, i) => ({
    id: `DOC-${i + 1}`, name: d, meta: polis[i % polis.length], extra: "Aktif",
  })),
  Poli: polis.map((p, i) => ({ id: `POL-${i + 1}`, name: p, meta: `Lantai ${1 + (i % 3)}`, extra: "Aktif" })),
  Tindakan: [
    "Refraksi", "Tonometri", "Slit Lamp", "Funduskopi", "Biometri",
    "Phacoemulsifikasi", "Laser YAG", "Injeksi Intravitreal",
  ].map((n, i) => ({ id: `ACT-${i + 1}`, name: n, meta: "Klinis", extra: "Aktif" })),
  Tarif: [
    ["Konsultasi Dokter Sp.M", 175000], ["Refraksi", 85000],
    ["Tonometri", 75000], ["Biometri", 250000],
    ["Phacoemulsifikasi (per mata)", 12500000], ["Laser YAG", 1800000],
  ].map(([n, p], i) => ({
    id: `TRF-${i + 1}`, name: String(n),
    meta: `Rp ${(p as number).toLocaleString("id-ID")}`, extra: "IDR",
  })),
  Payer: payers.map((p, i) => ({ id: `PYR-${i + 1}`, name: p, meta: i === 1 ? "Klaim" : "Tunai/Invoice", extra: "Aktif" })),
  Obat: [
    "Timolol 0.5%", "Latanoprost 0.005%", "Tobramycin Eye Drop",
    "Ofloxacin Eye Drop", "Artificial Tears", "Brinzolamide 1%",
  ].map((n, i) => ({ id: `OBT-${i + 1}`, name: n, meta: "Tetes Mata", extra: `Stok ${40 + i * 7}` })),
  Ruangan: [
    "Ruang Periksa 1", "Ruang Periksa 2", "Ruang Refraksi",
    "Ruang Laser", "OK Katarak", "Ruang Observasi",
  ].map((n, i) => ({ id: `RM-${i + 1}`, name: n, meta: `Lantai ${1 + (i % 3)}`, extra: "Aktif" })),
};

export const masterCategories = Object.keys(masterData);
