export interface User {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  category?: ServiceCategory;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  services?: Service[];
}

export interface Stylist {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  profile_image_url?: string;
  specializations: string[];
  is_available: boolean;
}

export interface StylistAvailability {
  id: string;
  stylist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface Customer {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  notes?: string;
  total_visits: number;
  total_spent: number;
  loyalty_points: number;
  favorite_stylist_id?: string;
  favorite_services: string[];
}

export interface Appointment {
  id: string;
  booking_reference: string;
  customer_id: string;
  stylist_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  total_amount: number;
  customer?: Customer;
  stylist?: Stylist;
  service?: Service;
}

export interface CallLog {
  call_id: string;
  session_id?: string;
  customer_id?: number;
  caller_phone?: string;
  from_number?: string;
  to_number?: string;
  direction: 'inbound' | 'outbound';
  status: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  ai_resolved?: boolean;
  was_escalated?: boolean;
  intent_detected?: string;
  transcript?: string;
  call_summary?: string;
  sentiment?: string;
  customer?: Customer;
  interactions?: Array<{
    agent_type: string;
    agent_name?: string;
  }>;
}

export interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  totalRevenue: number;
  totalCustomers: number;
  appointmentsByStatus: { status: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
