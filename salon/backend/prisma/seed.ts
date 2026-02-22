import { PrismaClient, UserRole, DayOfWeek, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@glambook.com' },
    update: {},
    create: {
      email: 'admin@glambook.com',
      phone: '+1-555-000-0001',
      password_hash: adminPasswordHash,
      full_name: 'Admin User',
      role: UserRole.admin,
      is_active: true,
      email_verified: true,
    },
  });
  console.log('Created admin user:', admin.email);

  // Create customer user
  const customerPasswordHash = await bcrypt.hash('customer123', 10);
  const customerUser = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      phone: '+1-555-123-4567',
      password_hash: customerPasswordHash,
      full_name: 'Jane Smith',
      role: UserRole.customer,
      is_active: true,
      email_verified: true,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { user_id: customerUser.user_id },
    update: {},
    create: {
      user_id: customerUser.user_id,
      notes: 'Regular customer, prefers Sarah',
    },
  });
  console.log('Created customer:', customerUser.email);

  // Create salon settings
  await prisma.salonSettings.upsert({
    where: { setting_id: 1 },
    update: {},
    create: {
      salon_name: 'GlamBook Salon',
      phone: '+1-555-123-4567',
      email: 'info@glambook.com',
      address: '123 Beauty Street',
      city: 'New York',
      state: 'NY',
      zip_code: '10001',
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
      description: 'Your premier destination for beauty and relaxation',
      booking_notice_hours: 2,
      cancellation_hours: 24,
      max_advance_booking_days: 60,
      slot_duration_minutes: 30,
    },
  });
  console.log('Created salon settings');

  // Create business hours
  const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of daysOfWeek) {
    const isOpen = day !== 'sunday';
    await prisma.businessHours.upsert({
      where: { day_of_week: day },
      update: {},
      create: {
        day_of_week: day,
        is_open: isOpen,
        open_time: new Date('1970-01-01T09:00:00'),
        close_time: new Date('1970-01-01T18:00:00'),
      },
    });
  }
  console.log('Created business hours');

  // Create service categories
  const hairCategory = await prisma.serviceCategory.upsert({
    where: { category_id: 1 },
    update: {},
    create: {
      name: 'Hair Services',
      description: 'All hair styling and treatment services',
      display_order: 1,
      icon: 'scissors',
      is_active: true,
    },
  });

  const nailsCategory = await prisma.serviceCategory.upsert({
    where: { category_id: 2 },
    update: {},
    create: {
      name: 'Nail Services',
      description: 'Manicures, pedicures, and nail art',
      display_order: 2,
      icon: 'hand',
      is_active: true,
    },
  });

  const skinCategory = await prisma.serviceCategory.upsert({
    where: { category_id: 3 },
    update: {},
    create: {
      name: 'Skin Care',
      description: 'Facials and skin treatments',
      display_order: 3,
      icon: 'sparkles',
      is_active: true,
    },
  });
  console.log('Created service categories');

  // Create services
  const services = [
    { name: 'Haircut', description: 'Professional haircut and styling', duration: 45, price: 50, category_id: hairCategory.category_id },
    { name: 'Hair Coloring', description: 'Full hair coloring service', duration: 120, price: 150, category_id: hairCategory.category_id },
    { name: 'Highlights', description: 'Partial or full highlights', duration: 90, price: 120, category_id: hairCategory.category_id },
    { name: 'Blowout', description: 'Wash and blowout styling', duration: 30, price: 35, category_id: hairCategory.category_id },
    { name: 'Deep Conditioning', description: 'Deep conditioning treatment', duration: 30, price: 40, category_id: hairCategory.category_id },
    { name: 'Manicure', description: 'Classic manicure', duration: 30, price: 25, category_id: nailsCategory.category_id },
    { name: 'Pedicure', description: 'Classic pedicure', duration: 45, price: 40, category_id: nailsCategory.category_id },
    { name: 'Gel Manicure', description: 'Long-lasting gel manicure', duration: 45, price: 45, category_id: nailsCategory.category_id },
    { name: 'Facial', description: 'Rejuvenating facial treatment', duration: 60, price: 80, category_id: skinCategory.category_id },
    { name: 'Microdermabrasion', description: 'Skin resurfacing treatment', duration: 45, price: 100, category_id: skinCategory.category_id },
  ];

  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    await prisma.service.upsert({
      where: { service_id: i + 1 },
      update: {},
      create: {
        name: service.name,
        description: service.description,
        duration_minutes: service.duration,
        price: service.price,
        category_id: service.category_id,
        is_active: true,
        display_order: i + 1,
      },
    });
  }
  console.log('Created services');

  // Create stylists
  const stylists = [
    { full_name: 'Sarah Johnson', email: 'sarah@glambook.com', phone: '+1-555-001-0001', bio: 'Master stylist with 10 years experience', specialties: ['Hair Coloring', 'Highlights'] },
    { full_name: 'Mike Chen', email: 'mike@glambook.com', phone: '+1-555-001-0002', bio: 'Expert in precision cuts and modern styles', specialties: ['Haircut', 'Blowout'] },
    { full_name: 'Emily Davis', email: 'emily@glambook.com', phone: '+1-555-001-0003', bio: 'Nail art specialist', specialties: ['Manicure', 'Gel Manicure', 'Pedicure'] },
    { full_name: 'Lisa Wong', email: 'lisa@glambook.com', phone: '+1-555-001-0004', bio: 'Licensed esthetician', specialties: ['Facial', 'Microdermabrasion'] },
  ];

  for (let i = 0; i < stylists.length; i++) {
    const stylist = stylists[i];
    const createdStylist = await prisma.stylist.upsert({
      where: { stylist_id: i + 1 },
      update: {},
      create: {
        full_name: stylist.full_name,
        email: stylist.email,
        phone: stylist.phone,
        bio: stylist.bio,
        specialties: stylist.specialties,
        is_active: true,
        hire_date: new Date('2020-01-01'),
      },
    });

    // Create schedules for each stylist
    for (const day of daysOfWeek) {
      if (day !== 'sunday') {
        await prisma.stylistSchedule.upsert({
          where: {
            stylist_id_day_of_week: {
              stylist_id: createdStylist.stylist_id,
              day_of_week: day,
            },
          },
          update: {},
          create: {
            stylist_id: createdStylist.stylist_id,
            day_of_week: day,
            is_working: true,
            start_time: new Date('1970-01-01T09:00:00'),
            end_time: new Date('1970-01-01T18:00:00'),
          },
        });
      }
    }
  }
  console.log('Created stylists and schedules');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
