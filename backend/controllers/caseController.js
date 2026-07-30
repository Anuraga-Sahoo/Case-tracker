const Case = require('../models/Case');
const User = require('../models/User');
const Document = require('../models/Document');
const Comment = require('../models/Comment');
const AuditLog = require('../models/AuditLog');
const { validateTransition } = require('../utils/stateMachine');

// @desc    Create a new case
// @route   POST /api/cases
// @access  Private (Manager only)
const createCase = async (req, res) => {
  const { clientName, subjectName, caseType, dueDate, assignedTo } = req.body;

  try {
    if (!clientName || !subjectName || !caseType || !dueDate) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Determine initial status
    let status = 'New';
    if (assignedTo) {
      const agent = await User.findById(assignedTo);
      if (!agent || agent.role !== 'Agent') {
        return res.status(400).json({ message: 'Assigned user must be a valid Agent' });
      }
      status = 'Assigned';
    }

    const newCase = await Case.create({
      clientName,
      subjectName,
      caseType,
      dueDate,
      assignedTo: assignedTo || null,
      status,
    });

    // Create Audit Log
    await AuditLog.create({
      caseId: newCase._id,
      action: `Case created and status set to '${status}'${assignedTo ? ' (Assigned to agent)' : ''}`,
      changedBy: req.user._id,
      previousStatus: null,
      newStatus: status,
    });

    return res.status(201).json(newCase);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get cases (paginated, with search & filter)
// @route   GET /api/cases
// @access  Private
const getCases = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const filter = {};

    // Role restrictions: Agent only sees their own assigned cases
    if (req.user.role === 'Agent') {
      filter.assignedTo = req.user._id;
    } else {
      // Manager filters
      if (req.query.agent) {
        filter.assignedTo = req.query.agent;
      }
    }

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Search query
    if (req.query.search) {
      filter.$or = [
        { clientName: { $regex: req.query.search, $options: 'i' } },
        { subjectName: { $regex: req.query.search, $options: 'i' } },
        { caseType: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const totalCases = await Case.countDocuments(filter);
    const cases = await Case.find(filter)
      .populate('assignedTo', 'fullName username')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      cases,
      page,
      pages: Math.ceil(totalCases / limit),
      total: totalCases,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get case details by ID
// @route   GET /api/cases/:id
// @access  Private
const getCaseById = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id).populate(
      'assignedTo',
      'fullName username'
    );

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Enforce role permission
    if (
      req.user.role === 'Agent' &&
      caseItem.assignedTo &&
      caseItem.assignedTo._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied: Case not assigned to you' });
    }

    // Fetch related records
    const documents = await Document.find({ caseId: caseItem._id }).populate(
      'uploadedBy',
      'fullName role'
    );
    const comments = await Comment.find({ caseId: caseItem._id })
      .populate('author', 'fullName role')
      .sort({ createdAt: 1 });
    const auditLogs = await AuditLog.find({ caseId: caseItem._id })
      .populate('changedBy', 'fullName role')
      .sort({ timestamp: 1 });

    return res.json({
      case: caseItem,
      documents,
      comments,
      auditLogs,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update Case Status
// @route   PUT /api/cases/:id/status
// @access  Private
const updateCaseStatus = async (req, res) => {
  const { status: newStatus, notes, managerFeedback } = req.body;

  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Enforce Agent assignment constraint
    if (
      req.user.role === 'Agent' &&
      (!caseItem.assignedTo || caseItem.assignedTo.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Access denied: Case is not assigned to you' });
    }

    // Validate Transition
    const transitionValidation = validateTransition(
      caseItem.status,
      newStatus,
      req.user.role
    );

    if (!transitionValidation.isValid) {
      return res.status(400).json({ message: transitionValidation.error });
    }

    const previousStatus = caseItem.status;
    caseItem.status = newStatus;

    // Optional updates
    if (req.user.role === 'Agent' && notes !== undefined) {
      caseItem.notes = notes;
    }
    if (req.user.role === 'Manager' && managerFeedback !== undefined) {
      caseItem.managerFeedback = managerFeedback;
    }

    await caseItem.save();

    // Create Audit Log
    const userString = `${req.user.fullName} (${req.user.role})`;
    let actionDescription = `Status changed from '${previousStatus}' to '${newStatus}' by ${userString}`;
    if (req.user.role === 'Manager' && managerFeedback) {
      actionDescription += `. Feedback: "${managerFeedback}"`;
    }
    if (req.user.role === 'Agent' && notes) {
      actionDescription += `. Agent notes: "${notes}"`;
    }

    await AuditLog.create({
      caseId: caseItem._id,
      action: actionDescription,
      changedBy: req.user._id,
      previousStatus,
      newStatus,
    });

    return res.json(caseItem);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Edit case details (like agent assignment, metadata)
// @route   PUT /api/cases/:id
// @access  Private (Manager only)
const updateCaseDetails = async (req, res) => {
  const { clientName, subjectName, caseType, dueDate, assignedTo } = req.body;

  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    let assignmentDetails = '';
    const oldAssigneeId = caseItem.assignedTo ? caseItem.assignedTo.toString() : null;

    if (assignedTo !== undefined) {
      if (assignedTo === null) {
        caseItem.assignedTo = null;
        if (caseItem.status === 'Assigned' || caseItem.status === 'New') {
          caseItem.status = 'New';
        }
        if (oldAssigneeId) {
          assignmentDetails = 'Agent unassigned';
        }
      } else {
        const agent = await User.findById(assignedTo);
        if (!agent || agent.role !== 'Agent') {
          return res.status(400).json({ message: 'Assigned user must be an Agent' });
        }

        if (oldAssigneeId !== assignedTo) {
          caseItem.assignedTo = assignedTo;
          assignmentDetails = `Assigned to ${agent.fullName}`;
          // If status was New, move to Assigned
          if (caseItem.status === 'New') {
            caseItem.status = 'Assigned';
          }
        }
      }
    }

    if (clientName) caseItem.clientName = clientName;
    if (subjectName) caseItem.subjectName = subjectName;
    if (caseType) caseItem.caseType = caseType;
    if (dueDate) caseItem.dueDate = dueDate;

    const previousStatus = caseItem.status;
    await caseItem.save();

    // Log the change
    let actionMsg = 'Case details updated';
    if (assignmentDetails) {
      actionMsg += ` (${assignmentDetails})`;
    }

    await AuditLog.create({
      caseId: caseItem._id,
      action: actionMsg,
      changedBy: req.user._id,
      previousStatus,
      newStatus: caseItem.status,
    });

    const updatedCase = await Case.findById(caseItem._id).populate(
      'assignedTo',
      'fullName username'
    );
    return res.json(updatedCase);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createCase,
  getCases,
  getCaseById,
  updateCaseStatus,
  updateCaseDetails,
};
