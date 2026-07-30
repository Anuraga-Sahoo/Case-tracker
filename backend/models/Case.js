const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    caseType: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['New', 'Assigned', 'In Progress', 'Submitted', 'Cleared', 'Discrepant'],
      default: 'New',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    managerFeedback: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Case', caseSchema);
