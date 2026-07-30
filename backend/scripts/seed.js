const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Case = require('../models/Case');
const Document = require('../models/Document');
const Comment = require('../models/Comment');
const AuditLog = require('../models/AuditLog');

dotenv.config();

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/case-tracker';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Case.deleteMany({});
    await Document.deleteMany({});
    await Comment.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Database collections cleared.');

    // Seed Users
    const manager = await User.create({
      username: 'manager',
      password: 'password123',
      fullName: 'Sarah Jenkins',
      role: 'Manager',
    });

    const agent1 = await User.create({
      username: 'agent1',
      password: 'password123',
      fullName: 'Alex Carter',
      role: 'Agent',
    });

    const agent2 = await User.create({
      username: 'agent2',
      password: 'password123',
      fullName: 'Emma Watson',
      role: 'Agent',
    });

    console.log('Users seeded:');
    console.log(`- Manager: manager / password123`);
    console.log(`- Agent 1: agent1 / password123`);
    console.log(`- Agent 2: agent2 / password123`);

    // Seed Cases
    // Case 1: New Case
    const case1 = await Case.create({
      clientName: 'Nvidia Corp',
      subjectName: 'AI Server Purchase Review',
      caseType: 'Hardware procurement',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'New',
    });

    await AuditLog.create({
      caseId: case1._id,
      action: `Case created and status set to 'New' by ${manager.fullName} (Manager)`,
      changedBy: manager._id,
      previousStatus: null,
      newStatus: 'New',
    });

    // Case 2: Assigned Case
    const case2 = await Case.create({
      clientName: 'Google LLC',
      subjectName: 'AdSense Audit Q2',
      caseType: 'Financial Compliance',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      assignedTo: agent1._id,
      status: 'Assigned',
    });

    await AuditLog.create({
      caseId: case2._id,
      action: `Case created and status set to 'New' by ${manager.fullName} (Manager)`,
      changedBy: manager._id,
      previousStatus: null,
      newStatus: 'New',
    });

    await AuditLog.create({
      caseId: case2._id,
      action: `Case assigned to ${agent1.fullName} (Agent). Status changed to 'Assigned' by ${manager.fullName} (Manager)`,
      changedBy: manager._id,
      previousStatus: 'New',
      newStatus: 'Assigned',
    });

    // Case 3: In Progress Case
    const case3 = await Case.create({
      clientName: 'SpaceX',
      subjectName: 'Falcon 9 Launch Parts Audit',
      caseType: 'Logistics',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      assignedTo: agent1._id,
      status: 'In Progress',
      notes: 'Initial component inventory catalog received. Starting validation.',
    });

    await AuditLog.create({
      caseId: case3._id,
      action: `Case created and status set to 'New' by ${manager.fullName} (Manager)`,
      changedBy: manager._id,
      previousStatus: null,
      newStatus: 'New',
    });

    await AuditLog.create({
      caseId: case3._id,
      action: `Case assigned to ${agent1.fullName} (Agent). Status changed to 'Assigned'`,
      changedBy: manager._id,
      previousStatus: 'New',
      newStatus: 'Assigned',
    });

    await AuditLog.create({
      caseId: case3._id,
      action: `Status changed to 'In Progress' by ${agent1.fullName} (Agent). Notes added: "${case3.notes}"`,
      changedBy: agent1._id,
      previousStatus: 'Assigned',
      newStatus: 'In Progress',
    });

    // Add comments to SpaceX case
    await Comment.create({
      caseId: case3._id,
      author: agent1._id,
      text: 'Sarah, could you check if the shipping invoice file is required, or is the packing list sufficient?',
    });

    await Comment.create({
      caseId: case3._id,
      author: manager._id,
      text: 'Emma/Alex, both files are required. Please check with SpaceX logistics manager if missing.',
    });

    // Case 4: Submitted Case
    const case4 = await Case.create({
      clientName: 'Apple Inc',
      subjectName: 'App Store Developer Agreement Audit',
      caseType: 'Legal Compliance',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue/just past
      assignedTo: agent2._id,
      status: 'Submitted',
      notes: 'All developers contracts and terms verified. Uploaded matching certificate.',
    });

    await AuditLog.create({
      caseId: case4._id,
      action: `Case created and assigned to ${agent2.fullName} (Agent)`,
      changedBy: manager._id,
      previousStatus: null,
      newStatus: 'Assigned',
    });

    await AuditLog.create({
      caseId: case4._id,
      action: `Status changed to 'In Progress' by ${agent2.fullName} (Agent)`,
      changedBy: agent2._id,
      previousStatus: 'Assigned',
      newStatus: 'In Progress',
    });

    // Mock document
    const doc = await Document.create({
      caseId: case4._id,
      uploadedBy: agent2._id,
      filename: 'developer_agreement_signed.pdf',
      originalName: 'developer_agreement_signed.pdf',
      filepath: '/uploads/sample_developer_agreement.pdf',
      fileType: 'application/pdf',
    });

    await AuditLog.create({
      caseId: case4._id,
      action: `File uploaded: "${doc.originalName}" by ${agent2.fullName} (Agent)`,
      changedBy: agent2._id,
      previousStatus: 'In Progress',
      newStatus: 'In Progress',
    });

    await AuditLog.create({
      caseId: case4._id,
      action: `Case submitted for review by ${agent2.fullName} (Agent). Notes: "${case4.notes}"`,
      changedBy: agent2._id,
      previousStatus: 'In Progress',
      newStatus: 'Submitted',
    });

    console.log('Sample cases and audit trails seeded successfully.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();
