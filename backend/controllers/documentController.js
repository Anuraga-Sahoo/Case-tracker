const Document = require('../models/Document');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');

// @desc    Upload document/photo for a case
// @route   POST /api/documents/:caseId
// @access  Private
const uploadDocument = async (req, res) => {
  const { caseId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const caseItem = await Case.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Role check: Agents can only upload to cases assigned to them
    if (
      req.user.role === 'Agent' &&
      (!caseItem.assignedTo || caseItem.assignedTo.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Access denied: Case is not assigned to you' });
    }

    const fileUrlPath = `/uploads/${req.file.filename}`;

    const newDoc = await Document.create({
      caseId,
      uploadedBy: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filepath: fileUrlPath,
      fileType: req.file.mimetype,
    });

    const userString = `${req.user.fullName} (${req.user.role})`;
    // Add Audit Log
    await AuditLog.create({
      caseId: caseItem._id,
      action: `File uploaded: "${req.file.originalname}" by ${userString}`,
      changedBy: req.user._id,
      previousStatus: caseItem.status,
      newStatus: caseItem.status,
    });

    const populatedDoc = await Document.findById(newDoc._id).populate(
      'uploadedBy',
      'fullName role'
    );

    return res.status(201).json(populatedDoc);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadDocument,
};
