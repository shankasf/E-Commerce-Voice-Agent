import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const practiceId = '00000000-0000-0000-0000-000000000001';

  // Create Practice
  const practice = await prisma.practice.upsert({
    where: { practiceId },
    update: {},
    create: {
      practiceId,
      name: 'Sunrise Family Healthcare',
      phone: '(555) 123-4567',
      email: 'info@sunrisehealthcare.com',
      addressLine1: '123 Healthcare Drive',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      timezone: 'America/Los_Angeles',
      officeHours: {
        monday: { open: '08:00', close: '17:00' },
        tuesday: { open: '08:00', close: '17:00' },
        wednesday: { open: '08:00', close: '17:00' },
        thursday: { open: '08:00', close: '17:00' },
        friday: { open: '08:00', close: '16:00' },
      },
    },
  });

  console.log('Created practice:', practice.name);

  // Create Providers
  const providers = await Promise.all([
    prisma.provider.upsert({
      where: { providerId: '00000000-0000-0000-0000-000000000101' },
      update: {},
      create: {
        providerId: '00000000-0000-0000-0000-000000000101',
        practiceId,
        firstName: 'Sarah',
        lastName: 'Johnson',
        title: 'Dr.',
        providerType: 'doctor',
        email: 'sarah.johnson@sunrisehealthcare.com',
        phone: '(555) 123-4568',
        specialization: 'Family Medicine',
        isActive: true,
      },
    }),
    prisma.provider.upsert({
      where: { providerId: '00000000-0000-0000-0000-000000000102' },
      update: {},
      create: {
        providerId: '00000000-0000-0000-0000-000000000102',
        practiceId,
        firstName: 'Michael',
        lastName: 'Chen',
        title: 'Dr.',
        providerType: 'doctor',
        email: 'michael.chen@sunrisehealthcare.com',
        phone: '(555) 123-4569',
        specialization: 'Internal Medicine',
        isActive: true,
      },
    }),
    prisma.provider.upsert({
      where: { providerId: '00000000-0000-0000-0000-000000000103' },
      update: {},
      create: {
        providerId: '00000000-0000-0000-0000-000000000103',
        practiceId,
        firstName: 'Emily',
        lastName: 'Rodriguez',
        title: 'NP',
        providerType: 'nurse_practitioner',
        email: 'emily.rodriguez@sunrisehealthcare.com',
        phone: '(555) 123-4570',
        specialization: 'Pediatrics',
        isActive: true,
      },
    }),
  ]);

  console.log('Created providers:', providers.length);

  // Create Patients
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { patientId: '00000000-0000-0000-0000-000000000201' },
      update: {},
      create: {
        patientId: '00000000-0000-0000-0000-000000000201',
        practiceId,
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'male',
        email: 'john.smith@email.com',
        phonePrimary: '(555) 234-5678',
        addressLine1: '456 Oak Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94103',
        isActive: true,
      },
    }),
    prisma.patient.upsert({
      where: { patientId: '00000000-0000-0000-0000-000000000202' },
      update: {},
      create: {
        patientId: '00000000-0000-0000-0000-000000000202',
        practiceId,
        firstName: 'Maria',
        lastName: 'Garcia',
        dateOfBirth: new Date('1992-07-22'),
        gender: 'female',
        email: 'maria.garcia@email.com',
        phonePrimary: '(555) 345-6789',
        addressLine1: '789 Pine Avenue',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94104',
        isActive: true,
      },
    }),
    prisma.patient.upsert({
      where: { patientId: '00000000-0000-0000-0000-000000000203' },
      update: {},
      create: {
        patientId: '00000000-0000-0000-0000-000000000203',
        practiceId,
        firstName: 'Robert',
        lastName: 'Williams',
        dateOfBirth: new Date('1978-11-08'),
        gender: 'male',
        email: 'robert.williams@email.com',
        phonePrimary: '(555) 456-7890',
        addressLine1: '321 Elm Road',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        isActive: true,
      },
    }),
    prisma.patient.upsert({
      where: { patientId: '00000000-0000-0000-0000-000000000204' },
      update: {},
      create: {
        patientId: '00000000-0000-0000-0000-000000000204',
        practiceId,
        firstName: 'Jennifer',
        lastName: 'Lee',
        dateOfBirth: new Date('1990-05-30'),
        gender: 'female',
        email: 'jennifer.lee@email.com',
        phonePrimary: '(555) 567-8901',
        addressLine1: '654 Maple Drive',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94106',
        isActive: true,
      },
    }),
  ]);

  console.log('Created patients:', patients.length);

  // Create Services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { serviceId: '00000000-0000-0000-0000-000000000301' },
      update: {},
      create: {
        serviceId: '00000000-0000-0000-0000-000000000301',
        practiceId,
        name: 'Annual Physical',
        description: 'Comprehensive annual wellness exam',
        duration: 45,
        price: 150.0,
        isActive: true,
      },
    }),
    prisma.service.upsert({
      where: { serviceId: '00000000-0000-0000-0000-000000000302' },
      update: {},
      create: {
        serviceId: '00000000-0000-0000-0000-000000000302',
        practiceId,
        name: 'Follow-up Visit',
        description: 'Follow-up appointment for ongoing care',
        duration: 20,
        price: 75.0,
        isActive: true,
      },
    }),
    prisma.service.upsert({
      where: { serviceId: '00000000-0000-0000-0000-000000000303' },
      update: {},
      create: {
        serviceId: '00000000-0000-0000-0000-000000000303',
        practiceId,
        name: 'Sick Visit',
        description: 'Appointment for acute illness',
        duration: 30,
        price: 100.0,
        isActive: true,
      },
    }),
  ]);

  console.log('Created services:', services.length);

  // Create Today's Appointments
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper function to create time as Date object
  const createTime = (hours: number, minutes: number) => {
    return new Date(`1970-01-01T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`);
  };

  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        practiceId,
        patientId: patients[0].patientId,
        providerId: providers[0].providerId,
        serviceId: services[0].serviceId,
        scheduledDate: today,
        scheduledTime: createTime(9, 0),
        duration: 45,
        status: 'confirmed',
        appointmentType: 'routine_checkup',
      },
    }),
    prisma.appointment.create({
      data: {
        practiceId,
        patientId: patients[1].patientId,
        providerId: providers[0].providerId,
        serviceId: services[2].serviceId,
        scheduledDate: today,
        scheduledTime: createTime(10, 30),
        duration: 30,
        status: 'scheduled',
        appointmentType: 'emergency',
      },
    }),
    prisma.appointment.create({
      data: {
        practiceId,
        patientId: patients[2].patientId,
        providerId: providers[1].providerId,
        serviceId: services[1].serviceId,
        scheduledDate: today,
        scheduledTime: createTime(11, 0),
        duration: 20,
        status: 'confirmed',
        appointmentType: 'telehealth',
      },
    }),
    prisma.appointment.create({
      data: {
        practiceId,
        patientId: patients[3].patientId,
        providerId: providers[2].providerId,
        serviceId: services[0].serviceId,
        scheduledDate: today,
        scheduledTime: createTime(14, 0),
        duration: 45,
        status: 'scheduled',
        appointmentType: 'routine_checkup',
      },
    }),
  ]);

  console.log('Created appointments:', appointments.length);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
