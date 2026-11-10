export interface ClassRow {
  id: string;
  tenantId: string;
  block: string;
  levelCode: string;
  variant: string;
  tuition: number;
  createdAt: string;
}
export interface StudentRow {
  id: string;
  tenantId: string;
  classId: string;
  matricule: string;
  lastName: string;
  firstName: string;
  sex: string;
  birthDate: string;
  birthPlace: string;
  fatherName: string;
  motherName: string;
  whatsapp: string;
  enrolledAt: string;
  tuitionTotal: number;
  paid1: number;
  paid2: number;
  archived: boolean;
  archiveReason: string;
  archivedAt: string | null;
  createdAt: string;
}
export interface StaffRow {
  id: string;
  tenantId: string;
  fullName: string;
  role: string;
  block: string;
  classId: string | null;
  phone: string;
  email: string;
  salary: number;
  status: string;
  hiredAt: string;
  createdAt: string;
}
export interface WaLogRow {
  id: string;
  tenantId: string;
  studentId: string | null;
  recipientName: string;
  phone: string;
  kind: string;
  message: string;
  createdAt: string;
}
export interface PaymentRow {
  id: string;
  tenantId: string;
  studentId: string;
  receiptNo: string;
  amount: number;
  tranche: number;
  method: string;
  paidAt: string;
  createdAt: string;
}
export interface SubjectFull {
  id: string;
  tenantId: string;
  classId: string;
  nameFr: string;
  nameEn: string;
  coefficient: number;
  position: number;
  createdAt: string;
}
export interface GradeFull {
  id: string;
  tenantId: string;
  studentId: string;
  subjectId: string;
  term: number;
  value: number;
  updatedAt: string;
}
export interface UpdateRow {
  id: string;
  version: string;
  titleFr: string;
  titleEn: string;
  notesFr: string;
  notesEn: string;
  status: string;
  deployedAt: string | null;
  createdAt: string;
}
export interface TenantInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  plan: string;
  structure: string;
  structures: string[];
  createdByAdmin: boolean;
  isSandbox: boolean;
  seenVersion: string;
  subscriptionEndsAt: string | null;
  createdAt: string;
}
export interface TenantData {
  tenant: TenantInfo;
  classes: ClassRow[];
  students: StudentRow[];
  archivedStudents: StudentRow[];
  payments: PaymentRow[];
  subjects: SubjectFull[];
  grades: GradeFull[];
  staff: StaffRow[];
  waLogs: WaLogRow[];
  latestUpdate: UpdateRow | null;
}
export interface AdminTenant extends TenantInfo {}
export interface SubRequestRow {
  id: string;
  schoolName: string;
  phone: string;
  email: string;
  plan: string;
  structure: string;
  paymentMethod: string;
  paymentRef: string;
  status: string;
  createdAt: string;
}
export interface AdminData {
  tenants: AdminTenant[];
  requests: SubRequestRow[];
  updates: UpdateRow[];
}
export interface ReceiptInfo {
  no: string;
  date: string;
  studentName: string;
  matricule: string;
  className: string;
  tranche: number;
  amount: number;
  method: string;
  total: number;
  paid: number;
  rest: number;
}